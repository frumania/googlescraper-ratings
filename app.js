//START
var google = require('./lib/google')
var express = require('express');
var app = express();

const awsServerlessExpressMiddleware = require('aws-serverless-express/middleware')
app.use(awsServerlessExpressMiddleware.eventContext())

var url = require('url');

app.get('/', function (request, response) 
{
  var query = url.parse(request.url,true).query;
  var search = query.q;
  var language = query.l;
  var input;

  if(language && language == "de")
  {
    google.tld = 'de'
    google.lang = 'de'
    google.requestOptions = {}
    google.nextText = 'Weiter'
    google.priceText = 'Preisspanne:';
  }

  if(request.apiGateway)
  {
    input = request.apiGateway.event;
    console.log(input);

    if(input.query)
    search = input.query;
  }

  search = search.replace(/\,/g, " ");
  search = search.replace(/\+/g, " ");
  search = search.replace(/\-/g, " ");
  search = search.replace(/\s\s/g, " ");

  console.log("Searchterm: "+search);

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