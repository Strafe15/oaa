var request = require('request');
var parseTranslation = require('./parse-translation');
var fs = require('fs');
var path = require('path');

var languageShortNames = {
  german: 'de',
  russian: 'ru',
  chinese: 'zh',
  portuguese: 'pt',
  spanish: 'es'
};

getDuplicateStrings();

function getDuplicateStrings () {
  var englishData = parseTranslation();
  var foundStrings = {};
  var duplicateStrings = {}

  Object.keys(englishData.lang.Tokens.values).forEach(function (key) {
    var str = englishData.lang.Tokens.values[key];
    if (foundStrings[str]) {
      if (!duplicateStrings[foundStrings[str]]) {
        duplicateStrings[foundStrings[str]] = {
          string: str,
          keys: [key]
        };
      } else {
        duplicateStrings[foundStrings[str]].keys.push(key);
      }
      return;
    }

    foundStrings[str] = key;
  });

  return duplicateStrings;
}

function getTranslationsForLanguage (lang, cb) {
  request.get({
    url: 'http://www.transifex.com/api/2/project/open-angel-arena/resource/addon_english/translation/' + lang + '?mode=onlytranslated',
    auth: {
      user: process.env.TRANSIFEX_USER,
      pass: process.env.TRANSIFEX_PASSWORD
    },
    json: true
  }, function (err, data) {
    var data = JSON.parse(data.body.content);
    cb(err, data);
  });
}

function generateFileForTranslations (languageName, translations) {
  var duplicateStrings = getDuplicateStrings();
  var lines = [];
  lines.push('"lang"');
  lines.push('{');
  lines.push('  "Language"      "' + languageName + '"');
  lines.push('  "Tokens"');
  lines.push('  {');
  lines.push('    //==================================================================================');
  lines.push('    // This file is auto-generated, do not edit it directly. Your changes will be lost.');
  lines.push('    //==================================================================================');
  lines.push();

  Object.keys(translations).forEach(function (key) {
    if (!translations[key].length) {
      return;
    }
    if (duplicateStrings[key]) {
      lines.push();
    }
    var indent = (new Array(100 - key.length)).join(' ');
    lines.push('    ' + JSON.stringify(key) + indent + JSON.stringify(translations[key]));

    if (duplicateStrings[key]) {
      duplicateStrings[key].keys.forEach(function (dupKey) {
        var indent = (new Array(100 - dupKey.length)).join(' ');
        lines.push('    ' + JSON.stringify(dupKey) + indent + JSON.stringify(translations[key]));
      });
    }
  });
  // done
  lines.push('  }');
  lines.push('}');
  lines.push('');

  return lines;
}

function generateTranslations (lang) {
  getTranslationsForLanguage(languageShortNames[lang], function (err, data) {
    // translations
    var lines = generateFileForTranslations(lang, data);
    fs.writeFileSync(path.join(__dirname, '../game/resource/addon_' + lang + '.txt'), lines.join('\n'), {
      encoding: 'ucs2'
    });
  });
}

Object.keys(languageShortNames).map(generateTranslations);
