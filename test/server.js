var mockHttp = require('node-mocks-http');
var tester = require('./test_env');
var chai = require('chai');
var expect = chai.expect;

var server = require('../lib/server');

function makeEvent () {
	return {
		"email": "nick@sendgrid.com",
		"timestamp": 1380822437,
		"newsletter": {
			"newsletter_user_list_id": "10557865",
			"newsletter_id": "1943530",
			"newsletter_send_id": "2308608"
		},
		"category": [
			"Tests",
			"Newsletter"
		],
		"event": "unsubscribe"
	};
}

function mockElasticClient (err,data) {
	data = data || {};
	return {
		bulk: function(arg, callback) {
			if (err) {
				callback(err,data);
			}
			else {
				callback(null,data);
			}
		}
	};
}

describe('server',function(){

	it('should provide init function to pass elasticsearch client',function(){
		expect(server.init.length).to.equal(1);
		server.init(mockElasticClient());
	});

	it('should log sendgrid API callback to elasticsearch',function(){
		var req = mockHttp.createRequest();
		var res = mockHttp.createResponse();
		req.body = [makeEvent()];
		
		server.init(mockElasticClient());
		server.logger(req,res);
		
		var headers = res._getHeaders();
		var body = res._getData();
		
		expect(res.statusCode).to.equal(200);
		expect(res._isEndCalled()).to.be.true;
		expect(body).to.equal(JSON.stringify({status:'ok'}));
	});

	it('should handle elasticsearch errors',function(){
		var req = mockHttp.createRequest();
		var res = mockHttp.createResponse();
		req.body = [makeEvent()];
		
		server.init(mockElasticClient('ERROR'));
		var result = tester(function(){
			server.logger(req,res);
		});
		
		var headers = res._getHeaders();
		var body = res._getData();
		
		expect(res.statusCode).to.equal(500);
		expect(result.logs[0]).to.equal('Error: {}');
	});
	
	it('should handle elasticsearch event errors',function(){
		var req = mockHttp.createRequest();
		var res = mockHttp.createResponse();
		req.body = [makeEvent()];
		
		server.init(mockElasticClient(false,{
			errors: 1,
			items: [{
				create: {
					error: true
				}
			}]
		}));
		var result = tester(function(){
			server.logger(req,res);
		});
		
		var headers = res._getHeaders();
		var body = res._getData();
		
		expect(res.statusCode).to.equal(500);
		expect(result.logs[0]).to.contain('Error:');
	});
	
	it('should handle invalid events',function(){
		var req = mockHttp.createRequest();
		var res = mockHttp.createResponse();
		req.body = {mango:"jango"};
		
		server.init(mockElasticClient());
		tester(()=>{
			server.logger(req,res);
		});
		
		var headers = res._getHeaders();
		var body = res._getData();
		
		expect(res.statusCode).to.equal(500);
		expect(body).to.contain('error');
	});
	
	it('should handle missing/invalid timestamp',function(){
		var req = mockHttp.createRequest();
		var res = mockHttp.createResponse();
		req.body = [{mango:"jango"}];
		
		server.init(mockElasticClient());
		tester(()=>{
			server.logger(req,res);
		});
		
		var headers = res._getHeaders();
		var body = res._getData();
		
		expect(res.statusCode).to.equal(500);
		expect(body).to.contain('error');
	});
	
	it('should provide health check endpoint',function(){
		var req = mockHttp.createRequest();
		var res = mockHttp.createResponse();
		
		server.init(mockElasticClient());
		server.status(req,res);
		
		var headers = res._getHeaders();
		var body = res._getData();
		
		expect(res.statusCode).to.equal(200);
		expect(res._isEndCalled()).to.be.true;
		expect(body).to.equal(JSON.stringify({status:'ok'}));
	});
	
	it('should provide copyright notice',function(){
		var req = mockHttp.createRequest();
		var res = mockHttp.createResponse();
		
		server.init(mockElasticClient());
		server.copyright(req,res);
		
		var headers = res._getHeaders();
		var body = res._getData();
		
		expect(res.statusCode).to.equal(200);
		expect(res._isEndCalled()).to.be.true;
	});
});
