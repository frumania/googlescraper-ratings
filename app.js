//START

var google = require('./lib/google')

var express = require('express');
var app = express();

const awsServerlessExpressMiddleware = require('aws-serverless-express/middleware')
app.use(awsServerlessExpressMiddleware.eventContext())

var url = require('url');

app.get('/', function (request, response) 
{
  //res.send('Hello World!');
  var query = url.parse(request.url,true).query;
  var search = query.q

  google.resultsPerPage = 25
  google.lang = 'de'
  google.tld = 'de'
  google.priceText = 'Preisspanne:'

  console.log(request.apiGateway.event);

  var input = request.apiGateway.event;

  if(input.query)
  {
    search = input.query;
  }

  console.log(search);

  response.setHeader("Content-Type", "application/json; charset=utf-8");

  if(search && search.length > 0)
  {
    google(search, function (err, res)
    {
      if (err) console.error(err)

      response.send(JSON.stringify(res.links));
    })
  }
  else
  {
    response.send("[]");
  }
});

app.listen(3000, function () {
  console.log('Example app listening on port 3000!');
});

module.exports = app