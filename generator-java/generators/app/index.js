/*
 * Copyright IBM Corporation 2017
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

var Generator = require('yeoman-generator');
var Handlebars = require('handlebars');
var Config = require("../lib/config");
var processor = require("../lib/fsprocessor");
var helpers = require("../lib/helpers");
var fspath = require('path');
var logger = require("../lib/log");
var fs = require('fs');
var Control = require('../lib/control');
var PromptMgr = require('../lib/promptmgr');

//clone any property, only if it is already present in the target object
var clone = function(from, to) {
  for (var prop in to) {
    if (to.hasOwnProperty(prop)) {
        if(from[prop]) {
          to[prop] = from[prop];
        }
    }
  }
}

var toObject = function(value) {
  if(typeof value == 'string') {
    return JSON.parse(value);
  }
  if(typeof value === 'object') {
    return value;
  }
  return value;
}

var config = new Config();
var promptmgr = new PromptMgr();

promptmgr.add('common');
promptmgr.add('liberty');
promptmgr.add('patterns');
promptmgr.add('bluemix');


module.exports = class extends Generator {

  constructor(args, opts) {
    super(args, opts);

    //create command line options that will be passed by YaaS
    this.option('buildType', {desc : 'Build system to use', type : String, default : 'maven'});
    this.option('createType', {desc : 'Type of application to generate', type : String, default : 'basic'});
    this.option('appName', {desc : 'Name of the application', type : String, default : 'LibertyProject'});
    this.option('artifactId', {desc : 'Artifact ID to use for the build', type : String, default : 'example'});
    this.option('groupId', {desc : 'Name of the application', type : String, default : 'liberty.projects'});
    this.option('version', {desc : 'Version of the application', type : String, default : '1.0-SNAPSHOT'});
    this.option('headless', {desc : 'Run this generator headless i.e. driven by options only, no prompting', type : String, default : "false"});
    this.option('debug', {desc : 'Generate a log.txt file in the root of the project', type : String, default : "false"});
    this.option('bluemix', {desc : 'Bluemix options', type : (value)=>{return toObject(value);}, default : undefined});
    this.option('input', {desc : 'Input data file', type : processor.getContentsSync, default : undefined});
    logger.writeToLog("Options", this.options);
  }

  initializing() {
    config = new Config();
    logger.writeToLog("Config (default)", config);
    //overwrite any default values with those specified as options
    clone(this.options, config);
    //set values based on either defaults or passed in values
    config.templateName = config.createType;
    config.templateRoot = this.templatePath();
    this._setProjectPath();
    logger.writeToLog("Config", config);
  }

  _setProjectPath() {
    //headless assumes that the output will be handled by the calling process / service
    if(config.headless === "true") {
      config.projectPath = fspath.resolve(this.destinationRoot());
    } else {
      config.projectPath = fspath.resolve(this.destinationRoot(), "projects/" + config.appName);
    }
  }

  prompting() {
    var promptWith = (config.headless === "true") ? [] : promptmgr.getQuestions();
    return this.prompt(promptWith).then((answers) => {
      logger.writeToLog("Answers", answers);
      promptmgr.afterPrompt(answers, config, 'ext:common');
      promptmgr.afterPrompt(answers, config);
      this._setProjectPath();
      logger.writeToLog("Config (after answers)", this.config);
    });
  }

  writing() {
    logger.writeToLog('template path', config.templateName);
    logger.writeToLog('project path', config.projectPath);
    if(!config.isValid()) {
      //the config object is not valid, so need to exit at this point
      this.log("Error : configuration is invalid, code generation is aborted");
      throw "Invalid configuration";
    }
    this.destinationRoot(config.projectPath);
    logger.writeToLog("Destination path", this.destinationRoot());
    var control = new Control(fspath.resolve(config.templateRoot, config.templateName), config);
    processor.paths = control.getComposition();
    logger.writeToLog("Processor", processor);
    config.processProject(processor.paths);
    return processor.scan(config, (relativePath, template) => {
      var outFile = this.destinationPath(relativePath);
      logger.writeToLog("CB : writing to", outFile);
      try {
        var compiledTemplate = Handlebars.compile(template);
        var output = compiledTemplate(config);
        this.fs.write(outFile, output);
      } catch (err) {
        logger.writeToLog("Template error : " + relativePath, err.message);
      }
    });
  }

  end() {
    if(config.debug == "true") {
      var compiledTemplate = Handlebars.compile("{{#.}}\n{{{.}}}\n{{/.}}\n");
      var log = compiledTemplate(logger.getLogs);
      this.fs.write("log.txt", log);
    }
  }

};
