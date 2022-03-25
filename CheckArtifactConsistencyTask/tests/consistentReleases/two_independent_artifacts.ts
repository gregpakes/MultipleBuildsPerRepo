// eslint-disable-next-line @typescript-eslint/no-unused-vars
import tmrm = require('azure-pipelines-task-lib/mock-run');
import path = require('path');
import fakeWebApi = require("../FakeWebApi");

/*
 * This test setup up for a release with artifacts A and B.
 * A and B both return no build statuses for one another, i.e. they dont need to be consistent for the release to go ahead.
 */

const taskPath = path.join(__dirname, '..', '..', 'src', 'CheckArtifactConsistencyTask.js');
const tmr: tmrm.TaskMockRunner = new tmrm.TaskMockRunner(taskPath);

const RELEASE_ID = 99;
const PROJECT_NAME = 'TestProject';

const linkedArtifact_A = {
    buildId: 100001,
    buildDefinitionId: 77001,
    buildName: 'build_a',
    buildNumber: 'build_for_artifact_a',
    sourceVersion: 'artifact_a_source',
    repoId: 'repo_a'
}

const linkedArtifact_B = {
    buildId: 100002,
    buildDefinitionId: 77002,
    buildName: 'build_b',
    buildNumber: 'build_for_artifact_b',
    sourceVersion: 'artifact_b_source',
    repoId: 'repo_b'
}

fakeWebApi.initStub(tmr);

fakeWebApi.releaseApi.getRelease
    .withArgs(PROJECT_NAME, RELEASE_ID)
    .returns({ 
        artifacts: [{
            type: 'Build',
            definitionReference: { version: { id: linkedArtifact_A.buildId, name: 'build_A' }, definition : { id: linkedArtifact_A.buildDefinitionId} } ,
            alias: 'artifact_A'
        }, {
            type: 'Build',
            definitionReference: { version: { id: linkedArtifact_B.buildId, name: 'build_B' }, definition : { id: linkedArtifact_B.buildDefinitionId} },
            alias: 'artifact_B'
        }] 
});

fakeWebApi.buildApi.getBuild.withArgs(PROJECT_NAME, linkedArtifact_A.buildId).returns({ 
    id: linkedArtifact_A.buildId,
    buildNumber: linkedArtifact_A.buildNumber,
    sourceVersion: linkedArtifact_A.sourceVersion,
    repository: { id: linkedArtifact_A.repoId },
    project: { name: PROJECT_NAME },
    definition: { id: linkedArtifact_A.buildDefinitionId, name: linkedArtifact_A.buildName },
    sourceBranch: 'master'
});

fakeWebApi.buildApi.getBuild.withArgs(PROJECT_NAME, linkedArtifact_B.buildId).returns({ 
    id: linkedArtifact_B.buildId,
    buildNumber: linkedArtifact_B.buildNumber,
    sourceVersion: linkedArtifact_B.sourceVersion,
    repository: { id: linkedArtifact_B.repoId },
    project: { name: PROJECT_NAME },
    definition: { id: linkedArtifact_B.buildDefinitionId, name: linkedArtifact_B.buildName },
    sourceBranch: 'master'
});

fakeWebApi.gitApi.getStatuses.withArgs(linkedArtifact_A.sourceVersion, linkedArtifact_A.repoId, PROJECT_NAME).returns([]);
fakeWebApi.gitApi.getStatuses.withArgs(linkedArtifact_B.sourceVersion, linkedArtifact_B.repoId, PROJECT_NAME).returns([]);

process.env['SYSTEM_TEAMFOUNDATIONCOLLECTIONURI'] = 'FakeUri';
process.env['RELEASE_RELEASEID'] = '' + RELEASE_ID;
process.env['SYSTEM_TEAMPROJECT'] = PROJECT_NAME;
process.env['SYSTEM_ACCESSTOKEN'] = 'AccessKey';

tmr.run();