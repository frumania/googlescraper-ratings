var request = require('request')
var cheerio = require('cheerio')
var querystring = require('querystring')
var util = require('util')
var parseDomain = require('parse-domain');
var UserAgent = require('user-agents');

var linkSel = 'a'
var descSel = 'span'
var itemSel = '#search div.g'
var ratingSel = 'g-review-stars'
var nextSel = 'td.b a span'
var googleBoxSel = '.knowledge-panel'

var proxy = true;
var proxy_url = "http://exp.frumania.com/proxy.php?"

var URL = '%s://www.google.%s/search?hl=%s&q=%s&start=%s&sa=N&num=%s&ie=UTF-8&oe=UTF-8&gws_rd=ssl'

var nextTextErrorMsg = 'Translate `google.nextText` option to selected language to detect next results link.'
var protocolErrorMsg = "Protocol `google.protocol` needs to be set to either 'http' or 'https', please use a valid protocol. Setting the protocol to 'https'."

if(proxy)
URL = proxy_url + URL; 

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

google.resultsPerPage = 25
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

  var userAgent = new UserAgent({ deviceCategory: 'desktop' }).toString();
  
  var requestOptions = {
    url: newUrl,
    method: 'GET',
    headers: { 
        'User-Agent': userAgent,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
    }
  }

  console.log(requestOptions);

  for (var k in google.requestOptions) {
    requestOptions[k] = google.requestOptions[k]
  }

  request(requestOptions, function (err, resp, body) {
    if ((err == null) && resp.statusCode === 200) {

      if(proxy)
      body = body.replace(/http:\/\/exp.frumania.com:80\/proxy.php\?/g,"");

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
      gratingcount = parseInt(result[1].replace(".","").replace(",",""));

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
        var descElem = $(elem).find(ratingSel).parent().parent().find(descSel)
        var ratingElem = $(elem).find(ratingSel).parent()
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

        //DEBUG
        //console.log(item.ratingfull);

        if(item.ratingfull.length > 0)
        {

          console.log(item.ratingfull);

          //RATING
          var regex_rating = /Rating: ([^\s]+)/;
          var match_rating = item.ratingfull.match(regex_rating);
          if(match_rating)
          item.rating = match_rating[1];

          if(item.rating && item.rating.includes("/"))
          {
            var tmp = item.rating.split("/");
            item.rating = (parseFloat(tmp[0].replace(",","."))/parseFloat(tmp[1])*5).toFixed(1);
          }

          //REVIEWS
          var regex_reviews = /([^\s]+) (reviews|votes)/;
          var match_reviews = item.ratingfull.match(regex_reviews);
          if(match_reviews)
          item.ratingCount = parseInt(match_reviews[1].substr(1).replace(".","").replace(",",""));

          console.log(match_reviews);

          //PRICE
          var regex_price = /Price range: ([^.?]+)/;
          var match_price = item.ratingfull.match(regex_price);
          if(match_price)
          item.price = match_price[1].replace(' ','');

          if(!isDuplicate(res.links, item))
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

function getHost(input)
{
  return parseDomain(input).domain;
}

function isDuplicate(urls, item)
{
  found = false;
  for (var i = 0; i < urls.length; i++) {

      if(urls[i].link && item.link)
      {
        current = getHost(urls[i].link);
        proof = getHost(item.link);

        //console.log(current +" vs. "+ proof);

        if(current.includes(proof))
          return true
        else
          found = false;
      }
  }
  return found;
}

module.exports = google