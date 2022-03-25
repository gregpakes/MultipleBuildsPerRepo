import tmrm = require('azure-pipelines-task-lib/mock-run');
import path = require('path');
import fakeWebApi = require(".././FakeWebApi");

const taskPath = path.join(__dirname, '..', '..', 'src', 'CheckArtifactConsistencyTask.js');
const tmr: tmrm.TaskMockRunner = new tmrm.TaskMockRunner(taskPath);

fakeWebApi.initStub(tmr);
fakeWebApi.releaseApi.getRelease.returns(undefined);

process.env['SYSTEM_TEAMFOUNDATIONCOLLECTIONURI'] = 'FakeUri';
process.env['RELEASE_RELEASEID'] = '99';
process.env['SYSTEM_TEAMPROJECT'] = 'TestProject';
process.env['SYSTEM_ACCESSTOKEN'] = 'AccessKey';

tmr.run();