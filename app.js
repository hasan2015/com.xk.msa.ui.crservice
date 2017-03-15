//by yanhaixun
var express = require('express');
var zookeeper = require('node-zookeeper-client');
var httpProxy = require('http-proxy');

var PORT = 4567;
var CONNECTION_STRING = '192.168.118.10:2181';
var REGISTRY_ROOT = '/registry';
// 链接ZooKeeper
var zk = zookeeper.createClient(CONNECTION_STRING);
zk.connect();
// 创建代理服务器对象并监听错误事件
var proxy = httpProxy.createProxyServer();
proxy.on('error', function(err, req, res) {
	res.end();
})
// 启动 web服务器
var cache = {};
var app = express();
app.use(express.static('public'));
app.all('*', function(req, res) {
	// 处理图标请求
	if (req.path == '/favicon.ico') {
		res.end();
		return;
	}
	// 获取服务器名称
	var serviceName = req.get('Service-Name');
	console.log('1--ServiceName:%s', serviceName);
	if (!serviceName) {
		console.log('2--Service-Name request header is now exist');
		res.end();
		return;
	}
	// 缓存
	if (cache[serviceName]) {
		console.log('11---cache[serviceName]'+cache[serviceName]);
		serviceAddress = cache[serviceName];
		// 执行反向代理
		proxy.web(req, res, {
			target : 'http://' + serviceAddress
		});
	} else {
		var servicePath = REGISTRY_ROOT + '/' + serviceName;
		console.log('4--servicePath:%s', servicePath);
		// 获取服务路径下的地址节点
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
			// 生成地址路径
			var addressPath = servicePath + '/';
			if (size == 1) {
				addressPath += addressNodes[0];
			} else {
				addressPath += addressNodes[paresInt(Math.random() * size)];
			}
			console.log('7--addressPath:%s', addressPath);
			// 获取服务路径
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
				// 执行反向代理
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