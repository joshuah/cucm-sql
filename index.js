var util = require("util");
var https = require("https");
var parseString = require('xml2js').parseString;

var XML_ENVELOPE = '<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ns="http://www.cisco.com/AXL/API/8.5"><soapenv:Header/><soapenv:Body><ns:executeSQLQuery><sql>%s</sql></ns:executeSQLQuery></soapenv:Body></soapenv:Envelope>';

function CucmSQLSession(cucmServerUrl, cucmUser, cucmPassword) {
	this._OPTIONS =  {
    host: cucmServerUrl, // The IP Address of the Communications Manager Server
    port: 443,           // Clearly port 443 for SSL -- I think it's the default so could be removed
    path: '/axl/',       // This is the URL for accessing axl on the server
    method: 'POST',      // AXL Requires POST messages
    headers: {
    	'SOAPAction': 'CUCM:DB ver=8.5',
   		'Authorization': 'Basic ' + new Buffer(cucmUser + ":" + cucmPassword).toString('base64'), 
   		'Content-Type': 'text/xml;'
   	},
   	rejectUnauthorized: false          // required to accept self-signed certificate
  }
}

CucmSQLSession.prototype.query = function(SQL, callback) {
	// The user needs to make sure they are sending safe SQL to the communications manager.
	var XML = util.format(XML_ENVELOPE, SQL);
	var soapBody = new Buffer(XML);
	var output = "";
	var options = this._OPTIONS;
	options.agent = new https.Agent({ keepAlive: false });

console.log(SQL);

	var req = https.request(options, function(res) {
    	res.setEncoding('utf8');
    	res.on('data', function(d) {
			output = output + d;
			if (output.length == res.headers['content-length']) {
				parseString(output, { explicitArray: false, explicitRoot: false }, function (err, result) {
					try {
						callback(null, result['soapenv:Body']['ns:executeSQLQueryResponse']['return']['row']);    	
					} catch(ex) {
						callback(ex)
					}
				});
			}
		});
		req.on('error', function(e) {
			callback(e);
		});
	});
	req.end(soapBody);

};

module.exports = function(cucmServerUrl, cucmUser, cucmPassword) {
	return new CucmSQLSession(cucmServerUrl, cucmUser, cucmPassword);
}
