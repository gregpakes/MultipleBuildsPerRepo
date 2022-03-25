// eslint-disable-next-line @typescript-eslint/no-unused-vars
import ma = require('azure-pipelines-task-lib/mock-answer');
import tmrm = require('azure-pipelines-task-lib/mock-run');
import path = require('path');

const taskPath = path.join(__dirname, '..', '..', 'src', 'CheckArtifactConsistencyTask.js');
const tmr: tmrm.TaskMockRunner = new tmrm.TaskMockRunner(taskPath);

// see https://github.com/microsoft/azure-pipelines-task-lib/issues/593 for why we're setting variables like this
process.env['SYSTEM_TEAMFOUNDATIONCOLLECTIONURI'] = 'FakeUri';
process.env['RELEASE_RELEASEID'] = '99';
process.env['SYSTEM_TEAMPROJECT'] = 'TestProject';

tmr.run();