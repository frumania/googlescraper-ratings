var assert = require('assert');
describe('Search', function() {
  describe('Example', function() {
    it('should return a result', function() 
    {
        //START
        var google = require('../lib/google')
        var url = require('url');
        const http = require('http')

        //var query = url.parse(request.url,true).query;
        var search = "waldorf+astoria+new+york";

        google.resultsPerPage = 25
        google.lang = 'de'
        google.tld = 'de'
        google.priceText = 'Preisspanne:'

        var response = [];

        if(search && search.length > 0)
        {
            google(search, function (err, res)
            {
                if (err) console.error(err)

                response = res.links;
                
                assert.notEqual(response.length, 0);
                assert.notEqual(response[0].link, "");

                console.log(response);
            })
        }

    });
  });
});