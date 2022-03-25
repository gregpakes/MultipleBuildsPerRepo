// eslint-disable-next-line @typescript-eslint/no-unused-vars
import ma = require('azure-pipelines-task-lib/mock-answer');
import tmrm = require('azure-pipelines-task-lib/mock-run');
import path = require('path');
// import { IRequestHandler } from "azure-devops-node-api/interfaces/common/VsoBaseInterfaces";
//import webApi = require("azure-devops-node-api/WebApi");
import sinon = require('sinon');
import fakeWebApi = require("../FakeWebApi");

const taskPath = path.join(__dirname, '..', '..', 'src', 'CheckArtifactConsistencyTask.js');
const tmr: tmrm.TaskMockRunner = new tmrm.TaskMockRunner(taskPath);


// let getHandlerFromTokenFake = ():IRequestHandler => <IRequestHandler>{};

fakeWebApi.initStub(tmr);
fakeWebApi.releaseApi.getRelease.returns({ artifacts: undefined });

process.env['SYSTEM_TEAMFOUNDATIONCOLLECTIONURI'] = 'FakeUri';
process.env['RELEASE_RELEASEID'] = '99';
process.env['SYSTEM_TEAMPROJECT'] = 'TestProject';
process.env['SYSTEM_ACCESSTOKEN'] = 'AccessKey';

tmr.run();