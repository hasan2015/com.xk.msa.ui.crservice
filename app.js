/**
 * @author yanhaixun 2017年3月23日
 */
var express = require('express');
var zookeeper = require('node-zookeeper-client');
var httpProxy = require('http-proxy');

var PORT = 2201;// #
				// registry=2001;config=2002;ca=2003;api.port=21**;ui.port=22**
var CONNECTION_STRING = '192.168.118.10:2001';
var REGISTRY_ROOT = '/registry';
var zk = zookeeper.createClient(CONNECTION_STRING);
zk.connect();
var proxy = httpProxy.createProxyServer();
proxy.on('error', function(err, req, res) {
	res.end();
}) 
var cache = {};
var app = express();
app.use(express.static('public'));
app.all('*', function(req, res) { 
	if (req.path == '/favicon.ico') {
		res.end();
		return;
	} 
	var serviceName = req.get('Service-Name');
	console.log('1--ServiceName:%s', serviceName);
	if (!serviceName) {
		console.log('2--Service-Name request header is now exist');
		res.end();
		return;
	} 
	if (cache[serviceName]) {
		console.log('11---cache[serviceName]' + cache[serviceName]);
		serviceAddress = cache[serviceName]; 
		proxy.web(req, res, {
			target : 'http://' + serviceAddress
		});
	} else {
		var servicePath = REGISTRY_ROOT + '/' + serviceName;
		console.log('4--servicePath:%s', servicePath); 
		zk.getChildren(servicePath, function(error, addressNodes) {
			if (error) {
				console.log('5--' + error.stack);
				res.end();
				return;
			}
			var size = addressNodes.length;
			if (size == 0) {
				console.log('6--address node is not exist');
				res.end();
				return;
			} 
			var addressPath = servicePath + '/';
			if (size == 1) {
				addressPath += addressNodes[0];
			} else {
				addressPath += addressNodes[paresInt(Math.random() * size)];
			}
			console.log('7--addressPath:%s', addressPath); 
			zk.getData(addressPath, function(error, serviceAddress) {
				if (error) {
					console.log('8--' + error.stack);
					res.end();
					return;
				}
				console.log('9--serviceAddress:%s', serviceAddress);
				if (!serviceAddress) {
					console.log('10--service address is not exist');
					res.end();
					return;
				} 
				proxy.web(req, res, {
					target : 'http://' + serviceAddress
				});

				cache[serviceName] = serviceAddress;
			});
		});
	}

});
app.listen(PORT, function() {
	console.log('3--server is running at %d', PORT);
});