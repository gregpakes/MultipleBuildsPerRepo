// eslint-disable-next-line @typescript-eslint/no-unused-vars
import ma = require('azure-pipelines-task-lib/mock-answer');
import tmrm = require('azure-pipelines-task-lib/mock-run');
import path = require('path');

const taskPath = path.join(__dirname, '..', 'src', 'CheckArtifactConsistencyTask.ts');
const tmr: tmrm.TaskMockRunner = new tmrm.TaskMockRunner(taskPath);

tmr.setInput('System.TeamFoundationCollectionUri', 'FakeUri');

tmr.run();