//START

var google = require('./lib/google')
var url = require('url');
const http = require('http')
const port = 8999

const requestHandler = (request, response) =>
{
  var query = url.parse(request.url,true).query;
  var search = query.q

  google.resultsPerPage = 25
  google.lang = 'de'
  google.tld = 'de'
  google.priceText = 'Preisspanne:'

  response.setHeader("Content-Type", "application/json; charset=utf-8");

  if(search && search.length > 0)
  {
    google(search, function (err, res)
    {
      if (err) console.error(err)

      response.end(JSON.stringify(res.links));
    })
  }
  else
  {
    response.end("[]");
  }
}

const server = http.createServer(requestHandler)

server.listen(port, (err) => {
  if (err) {
    return console.log('something bad happened', err)
  }

  console.log(`server is listening on ${port}`)
})
