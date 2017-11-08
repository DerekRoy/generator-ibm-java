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

/* Test to see if when you choose every technology type it builds */

'use strict';

const AssertBuilds = require('../../generators/lib/assert.builds');
const constant = require('../lib/constant');
const helpers = require('yeoman-test');
const path = require('path');

function Options(buildType, framework) {
  const platform = framework === constant.FRAMEWORK_SPRING ? 'SPRING' : 'JAVA';
  this.options = {
    headless: "true",
    debug: "true",
    buildType: buildType,
    createType: 'basicweb/' + framework,
    appName: constant.APPNAME,
    groupId: constant.GROUPID,
    artifactId: constant.ARTIFACTID,
    version: constant.VERSION,
    bluemix: {
      backendPlatform: platform
    }
  }
  
  this.before = function () {
    return helpers.run(path.join(__dirname, '../../generators/app'))
      .withOptions(this.options)
      .withPrompts({})
      .toPromise();
  }
}

const buildTypes = ['gradle', 'maven'];

describe('java generator : basicweb/liberty end to end test', function () {
  this.timeout(7000);
  for (var i = 0; i < buildTypes.length; i++) {
    describe('Generates a basicweb/liberty project build type ' + buildTypes[i], function () {
      const options = new Options(buildTypes[i], constant.FRAMEWORK_LIBERTY);
      before(options.before.bind(options));

      const assert = new AssertBuilds(buildTypes[i]);
      assert.assertBuilds();
    });
  }
});

describe('java generator : basicweb/spring end to end test', function () {
  this.timeout(7000);
  for (var i = 0; i < buildTypes.length; i++) {
    describe('Generates a basicweb/spring project build type ' + buildTypes[i], function () {
      const options = new Options(buildTypes[i], constant.FRAMEWORK_SPRING);
      before(options.before.bind(options));

      const assert = new AssertBuilds(buildTypes[i]);
      assert.assertBuilds();
    });
  }
});
