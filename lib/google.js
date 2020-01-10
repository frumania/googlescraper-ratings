var request = require('request')
var cheerio = require('cheerio')
var querystring = require('querystring')
var util = require('util')

var linkSel = '.r a'
var descSel = '.st'
var itemSel = 'div.g'
var ratingSel = 'div.slp'
var nextSel = 'td.b a span'
var googleBoxSel = '.knowledge-panel'

var URL = '%s://www.google.%s/search?hl=%s&q=%s&start=%s&sa=N&num=%s&ie=UTF-8&oe=UTF-8&gws_rd=ssl'

var nextTextErrorMsg = 'Translate `google.nextText` option to selected language to detect next results link.'
var protocolErrorMsg = "Protocol `google.protocol` needs to be set to either 'http' or 'https', please use a valid protocol. Setting the protocol to 'https'."

// start parameter is optional
function google (query, start, callback) {
  var startIndex = 0
  if (typeof callback === 'undefined') {
    callback = start
  } else {
    startIndex = start
  }
  igoogle(query, startIndex, callback)
}

google.resultsPerPage = 10
google.tld = 'com'
google.lang = 'en'
google.requestOptions = {}
google.nextText = 'Next'
google.protocol = 'https'
google.priceText = 'Price range:'

var igoogle = function (query, start, callback) {
  if (google.resultsPerPage > 100) google.resultsPerPage = 100 // Google won't allow greater than 100 anyway
  if (google.lang !== 'en' && google.nextText === 'Next') console.warn(nextTextErrorMsg)
  if (google.protocol !== 'http' && google.protocol !== 'https') {
    google.protocol = 'https'
    console.warn(protocolErrorMsg)
  }

  // timeframe is optional. splice in if set
  if (google.timeSpan) {
    URL = URL.indexOf('tbs=qdr:') >= 0 ? URL.replace(/tbs=qdr:[snhdwmy]\d*/, 'tbs=qdr:' + google.timeSpan) : URL.concat('&tbs=qdr:', google.timeSpan)
  }
  var newUrl = util.format(URL, google.protocol, google.tld, google.lang, querystring.escape(query), start, google.resultsPerPage)
  
  //newUrl = "https://www.google.de/search?q=waldorf+astoria+new+york";
  
  var requestOptions = {
    url: newUrl,
    method: 'GET',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/74.0.3229.157 Safari/537.36'
    }
  }

  console.log(newUrl);

  for (var k in google.requestOptions) {
    requestOptions[k] = google.requestOptions[k]
  }

  request(requestOptions, function (err, resp, body) {
    if ((err == null) && resp.statusCode === 200) {
      var $ = cheerio.load(body)
      var res = {
        url: newUrl,
        query: query,
        start: start,
        links: [],
        $: $,
        body: body
      }

      //DEBUG
      //console.log($(googleBoxSel).html())

      //ADD GOOGLE BLOCK
      var grating = $(googleBoxSel).first().find("g-review-stars").parent().find("span").first().text(); //e.g. 3,9  //$(googleBoxSel).find(".ul7Gbc").parent().children().first().text()
      var gratingcount = $(googleBoxSel).first().find("g-review-stars").parent().find("a").first().text()

      var regex = /([^\s]+) ([^\s]+)/
      var result = gratingcount.match(regex)

      if(result && result.length >= 1)
      gratingcount = result[1]

      if(grating != "")
      {
        var item = {
          title: "GOOGLE",
          link: "https://google.com"+$("#lu_map").parent().attr("data-url"),
          description: $(googleBoxSel).find(".ggV7z").text(), //$(googleBoxSel).find("._tA").first().text(),
          href: "https://google.com"+$("#lu_map").parent().attr("data-url"),  //"https://google.com",
          ratingfull: $(googleBoxSel).find(".Ob2kfd").text(), //$(googleBoxSel).find("._o0d").text(),
          rating: grating,
          ratingCount: gratingcount,
          price: "",
          openingInfo: $(googleBoxSel).find(".TLou0b").text(),
        }
       res.links.push(item)
      }
      //END GOOGLE BLOCK

      //console.log($(itemSel).length);
      //console.log(body);

      $(itemSel).each(function (i, elem) {

        var linkElem = $(elem).find(linkSel)
        var descElem = $(elem).find(descSel)
        var ratingElem = $(elem).find(ratingSel)
        var item = {
          title: $(linkElem).find("h3").text(),
          link: null,
          description: null,
          href: null,
          ratingfull: null,
          rating: 0,
          ratingCount: 0,
          price: ""
        }
        
        //var qsObj = querystring.parse($(linkElem).attr('href'))

        //if (qsObj['/url?q']) {
          item.link = $(linkElem).attr('href');
          item.href = $(linkElem).attr('href');
        //}

        //$(descElem).find('div').remove()
        item.description = $(descElem).text()

        //SPLIT Bewertung: 4 - 43 Rezensionen - Preisspanne: $$$

        item.ratingfull = $(ratingElem).text().trim()
        item.ratingfull = item.ratingfull.replace(/\s/g, " ");

        if(item.ratingfull.length > 0)
        {
          if(item.ratingfull.indexOf(google.priceText) > -1)
          {
            var regex = /([^\s]+): ([^\s]+) \- ([^\s]+) ([^\s]+) \- ([^\s]+): ([^.?]+)/
            var result = item.ratingfull.match(regex)

            //console.log(item.ratingfull)
            //console.log(result);

            if(result && result.length >= 4)
            {
              item.rating = result[2];
              item.ratingCount = parseInt(result[3].substr(1).replace(".",""));
              item.price = result[6].replace(/ /g,'');
            }

            //console.log(item.rating);

            if(item.rating && item.rating.includes("/"))
            {
              var tmp = item.rating.split("/");
              item.rating = (parseFloat(tmp[0].replace(",","."))/parseFloat(tmp[1])*5).toFixed(1);
            }
          }
          else
          {
            var regex = /([^\s]+): ([^\s]+) \- ([^\s]+) ([^\s]+)/
            var result = item.ratingfull.match(regex)

            if(result && result.length >= 2)
            {
              item.rating = result[2];
              item.ratingCount = parseInt(result[3].substr(1).replace(".",""));
            }

            if(item.rating && item.rating.includes("/"))
            {
              var tmp = item.rating.split("/");
              item.rating = (parseFloat(tmp[0].replace(",","."))/parseFloat(tmp[1])*5).toFixed(1);
            }
          }

          res.links.push(item)
        }

      })

      if ($(nextSel).last().text() === google.nextText) {
        res.next = function () {
          igoogle(query, start + google.resultsPerPage, callback)
        }
      }

      callback(null, res)
    } else {
      callback(new Error('Error on response' + (resp ? ' (' + resp.statusCode + ')' : '') + ':' + err + ' : ' + body), null, null)
    }
  })
}

module.exports = google
