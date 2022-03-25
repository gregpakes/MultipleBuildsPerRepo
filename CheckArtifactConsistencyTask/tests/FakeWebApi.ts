import tmrm = require('azure-pipelines-task-lib/mock-run');
import webApi = require("azure-devops-node-api/WebApi");
import sinon = require('sinon');

export const releaseApi = { 
    getRelease: sinon.stub()
};

export const buildApi = {
    getBuild: sinon.stub()
};

export const gitApi = {
    getStatuses: sinon.stub(),
    getCommit: sinon.stub()
}

export class StubWebApi {
    getReleaseApi(){
        return releaseApi;
    }

    getBuildApi(){
        return buildApi;
    }

    getGitApi(){
        return gitApi;
    }
}

export function initStub(tmr:tmrm.TaskMockRunner) {
    // setup stub over webApi
    sinon.stub(webApi, 'WebApi').callsFake((args) => new StubWebApi())
    // register "mock" with testing framework
    tmr.registerMock('azure-devops-node-api/WebApi', webApi);
}
