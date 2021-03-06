/**
 * Copyright 2017 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import * as assert from 'assert';

import {Setup} from '../src/detect_setup';
import {generateFiles} from '../src/generate_files';

import {Location, MockView} from './common';

const DOCKERFILE_NAME = 'Dockerfile';
const DOCKERIGNORE_NAME = '.dockerignore';

const BASE_IMAGE = 'some-namespace:some-tag';
const NODE_VERSION = 'v6.10.0';

const BASE =
    `# Dockerfile extending the generic Node image with application files for a
# single application.
FROM ${BASE_IMAGE}
`;

const UPGRADE_NODE =
    `# Check to see if the the version included in the base runtime satisfies
# '${
     NODE_VERSION
   }' and, if not, install a version of Node.js that does satisfy it.
RUN /usr/local/bin/install_node '${NODE_VERSION}'
`;

const COPY_CONTENTS = `COPY . /app/\n`;

const NPM_INSTALL_PRODUCTION_DEPS =
    `# You have to specify "--unsafe-perm" with npm install
# when running as root.  Failing to do this can cause
# install to appear to succeed even if a preinstall
# script fails, and may have other adverse consequences
# as well.
# This command will also cat the npm-debug.log file after the
# build, if it exists.
RUN npm install --unsafe-perm || \\
  ((if [ -f npm-debug.log ]; then \\
      cat npm-debug.log; \\
    fi) && false)
`;

const YARN_INSTALL_PRODUCTION_DEPS = `RUN yarn install --production || \\
  ((if [ -f yarn-error.log ]; then \\
      cat yarn-error.log; \\
    fi) && false)
`;

const YARN_START = `CMD yarn start\n`;
const NPM_START = `CMD npm start\n`;

const BASE_DOCKERIGNORE = `# Copyright 2015 Google Inc. All Rights Reserved.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#    http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
node_modules
.dockerignore
Dockerfile
npm-debug.log
yarn-error.log
.git
.hg
.svn`;

const DEFAULT_APP_YAML = 'app.yaml';

const DEFAULT_DOCKERIGNORE = `${BASE_DOCKERIGNORE}\n${DEFAULT_APP_YAML}\n`;

interface TestConfig {
  config: Setup;
  expectedDockerfile?: string;
  expectedDockerignore?: string;
}

function hasLocation(locationArr: Location[], location: Location) {
  return locationArr.findIndex(loc => {
    return loc && loc.contents === location.contents &&
        loc.exists === location.exists && loc.path === location.path;
  }) !== -1;
}

async function runTest(testConfig: TestConfig) {
  const appView = new MockView([]);
  const files = await generateFiles(appView, testConfig.config, BASE_IMAGE);
  assert.ok(files);

  // Verify the paths written matches the number of locations returned
  // by the method.
  assert.strictEqual(files.size, 2);
  assert.strictEqual(appView.pathsWritten.length, 2);

  assert.strictEqual(files.has(DOCKERFILE_NAME), true);
  assert.strictEqual(files.has(DOCKERIGNORE_NAME), true);

  if (testConfig.expectedDockerfile) {
    assert.strictEqual(
        files.get(DOCKERFILE_NAME), testConfig.expectedDockerfile);
    assert(hasLocation(appView.pathsWritten, {
      path: 'Dockerfile',
      exists: true,
      contents: testConfig.expectedDockerfile
    }));
  }

  if (testConfig.expectedDockerignore) {
    assert.strictEqual(
        files.get(DOCKERIGNORE_NAME), testConfig.expectedDockerignore);
    assert(hasLocation(appView.pathsWritten, {
      path: '.dockerignore',
      exists: true,
      contents: testConfig.expectedDockerignore
    }));
  }
}

describe('generateFiles', async () => {
  it('should generate correctly without installing dependencies, without ' +
         'start script, without Node.version, and using npm',
     async () => {
       await runTest({
         config: {
           canInstallDeps: false,
           nodeVersion: undefined,
           useYarn: false,
           appYamlPath: DEFAULT_APP_YAML
         },
         expectedDockerfile: BASE + COPY_CONTENTS + NPM_START,
         expectedDockerignore: DEFAULT_DOCKERIGNORE
       });
     });

  it('should generate correctly without installing dependencies, without ' +
         'start script, without Node.version, and using yarn',
     async () => {
       await runTest({
         config: {
           canInstallDeps: false,
           nodeVersion: undefined,
           useYarn: true,
           appYamlPath: DEFAULT_APP_YAML
         },
         expectedDockerfile: BASE + COPY_CONTENTS + YARN_START,
         expectedDockerignore: DEFAULT_DOCKERIGNORE
       });
     });

  it('should generate correctly without installing dependencies, without ' +
         'start script, with Node.version, and using npm',
     async () => {
       await runTest({
         config: {
           canInstallDeps: false,
           nodeVersion: NODE_VERSION,
           useYarn: false,
           appYamlPath: DEFAULT_APP_YAML
         },
         expectedDockerfile: BASE + UPGRADE_NODE + COPY_CONTENTS + NPM_START,
         expectedDockerignore: DEFAULT_DOCKERIGNORE
       });
     });

  it('should generate correctly without installing dependencies, without ' +
         'start script, with Node.version, and using yarn',
     async () => {
       await runTest({
         config: {
           canInstallDeps: false,
           nodeVersion: NODE_VERSION,
           useYarn: true,
           appYamlPath: DEFAULT_APP_YAML
         },
         expectedDockerfile: BASE + UPGRADE_NODE + COPY_CONTENTS + YARN_START,
         expectedDockerignore: DEFAULT_DOCKERIGNORE
       });
     });

  it('should generate correctly without installing dependencies, with start ' +
         'script, without Node.version, and using npm',
     async () => {
       await runTest({
         config: {
           canInstallDeps: false,
           nodeVersion: undefined,
           useYarn: false,
           appYamlPath: DEFAULT_APP_YAML
         },
         expectedDockerfile: BASE + COPY_CONTENTS + NPM_START,
         expectedDockerignore: DEFAULT_DOCKERIGNORE
       });
     });

  it('should generate correctly without installing dependencies, with start ' +
         'script, without Node.version, and using yarn',
     async () => {
       await runTest({
         config: {
           canInstallDeps: false,
           nodeVersion: undefined,
           useYarn: true,
           appYamlPath: DEFAULT_APP_YAML
         },
         expectedDockerfile: BASE + COPY_CONTENTS + YARN_START,
         expectedDockerignore: DEFAULT_DOCKERIGNORE
       });
     });

  it('should generate correctly without installing dependencies, with start ' +
         'script, with Node.version, and using npm',
     async () => {
       await runTest({
         config: {
           canInstallDeps: false,
           nodeVersion: NODE_VERSION,
           useYarn: false,
           appYamlPath: DEFAULT_APP_YAML
         },
         expectedDockerfile: BASE + UPGRADE_NODE + COPY_CONTENTS + NPM_START,
         expectedDockerignore: DEFAULT_DOCKERIGNORE
       });
     });

  it('should generate correctly without installing dependencies, with start ' +
         'script, with Node.version, and using yarn',
     async () => {
       await runTest({
         config: {
           canInstallDeps: false,
           nodeVersion: NODE_VERSION,
           useYarn: true,
           appYamlPath: DEFAULT_APP_YAML
         },
         expectedDockerfile: BASE + UPGRADE_NODE + COPY_CONTENTS + YARN_START,
         expectedDockerignore: DEFAULT_DOCKERIGNORE
       });
     });

  it('should generate correctly with installing dependencies, without start ' +
         'script, without Node.version, and using npm',
     async () => {
       await runTest({
         config: {
           canInstallDeps: true,
           nodeVersion: undefined,
           useYarn: false,
           appYamlPath: DEFAULT_APP_YAML
         },
         expectedDockerfile:
             BASE + COPY_CONTENTS + NPM_INSTALL_PRODUCTION_DEPS + NPM_START,
         expectedDockerignore: DEFAULT_DOCKERIGNORE
       });
     });

  it('should generate correctly with installing dependencies, without start ' +
         'script, without Node.version, and using yarn',
     async () => {
       await runTest({
         config: {
           canInstallDeps: true,
           nodeVersion: undefined,
           useYarn: true,
           appYamlPath: DEFAULT_APP_YAML
         },
         expectedDockerfile:
             BASE + COPY_CONTENTS + YARN_INSTALL_PRODUCTION_DEPS + YARN_START,
         expectedDockerignore: DEFAULT_DOCKERIGNORE
       });
     });

  it('should generate correctly with installing dependencies, without start ' +
         'script, with Node.version, and using npm',
     async () => {
       await runTest({
         config: {
           canInstallDeps: true,
           nodeVersion: NODE_VERSION,
           useYarn: false,
           appYamlPath: DEFAULT_APP_YAML
         },
         expectedDockerfile: BASE + UPGRADE_NODE + COPY_CONTENTS +
             NPM_INSTALL_PRODUCTION_DEPS + NPM_START,
         expectedDockerignore: DEFAULT_DOCKERIGNORE
       });
     });

  it('should generate correctly with installing dependencies, without start ' +
         'script, with Node.version, and using yarn',
     async () => {
       await runTest({
         config: {
           canInstallDeps: true,
           nodeVersion: NODE_VERSION,
           useYarn: true,
           appYamlPath: DEFAULT_APP_YAML
         },
         expectedDockerfile: BASE + UPGRADE_NODE + COPY_CONTENTS +
             YARN_INSTALL_PRODUCTION_DEPS + YARN_START,
         expectedDockerignore: DEFAULT_DOCKERIGNORE
       });
     });

  it('should generate correctly with installing dependencies, with start ' +
         'script, without Node.version, and using npm',
     async () => {
       await runTest({
         config: {
           canInstallDeps: true,
           nodeVersion: undefined,
           useYarn: false,
           appYamlPath: DEFAULT_APP_YAML
         },
         expectedDockerfile:
             BASE + COPY_CONTENTS + NPM_INSTALL_PRODUCTION_DEPS + NPM_START,
         expectedDockerignore: DEFAULT_DOCKERIGNORE
       });
     });

  it('should generate correctly with installing dependencies, with start ' +
         'script, without Node.version, and using yarn',
     async () => {
       await runTest({
         config: {
           canInstallDeps: true,
           nodeVersion: undefined,
           useYarn: true,
           appYamlPath: DEFAULT_APP_YAML
         },
         expectedDockerfile:
             BASE + COPY_CONTENTS + YARN_INSTALL_PRODUCTION_DEPS + YARN_START,
         expectedDockerignore: DEFAULT_DOCKERIGNORE
       });
     });

  it('should generate correctly with installing dependencies, with start ' +
         'script, with Node.version, and using npm',
     async () => {
       await runTest({
         config: {
           canInstallDeps: true,
           nodeVersion: NODE_VERSION,
           useYarn: false,
           appYamlPath: DEFAULT_APP_YAML
         },
         expectedDockerfile: BASE + UPGRADE_NODE + COPY_CONTENTS +
             NPM_INSTALL_PRODUCTION_DEPS + NPM_START,
         expectedDockerignore: DEFAULT_DOCKERIGNORE
       });
     });

  it('should generate correctly with installing dependencies, with start ' +
         'script, with Node.version, and using yarn',
     async () => {
       await runTest({
         config: {
           canInstallDeps: true,
           nodeVersion: NODE_VERSION,
           useYarn: true,
           appYamlPath: DEFAULT_APP_YAML
         },
         expectedDockerfile: BASE + UPGRADE_NODE + COPY_CONTENTS +
             YARN_INSTALL_PRODUCTION_DEPS + YARN_START,
         expectedDockerignore: DEFAULT_DOCKERIGNORE
       });
     });

  it('should generate a .dockerignore file with a custom deployment yaml ' +
         'path if specified',
     async () => {
       await runTest({
         config: {
           canInstallDeps: true,
           nodeVersion: NODE_VERSION,
           useYarn: true,
           appYamlPath: 'custom.yaml'
         },
         expectedDockerignore: `${BASE_DOCKERIGNORE}\ncustom.yaml\n`
       });
     });
});
