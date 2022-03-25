// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { BuildStatus } from 'azure-devops-node-api/interfaces/BuildInterfaces';
import tmrm = require('azure-pipelines-task-lib/mock-run');
import path = require('path');
import fakeWebApi = require("../FakeWebApi");

/*
 * This test setup up for a release with artifacts A and B.
 * A and B both return build statuses for one another, i.e. they need to be consistent for the release to go ahead.
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
    buildDefinitionId: 77002,
    buildName: 'build_b',
    repoId: 'repo_b'
}

// this artifact represents the old build of B. The new build of B linked to artifact A will be considered in-progress
const linkedArtifact_B_old = {
    buildId: 100002,
    buildNumber: 'build_for_artifact_b_old',
    sourceVersion: 'artifact_b_source_old',
    gitCommit: { author: { date: Date.now()-10 } }
}

// this artifact represents the new in-progress build of B
const linkedArtifact_B_new = {
    buildId: 100003,
    buildNumber: 'build_for_artifact_b_new',
    sourceVersion: 'artifact_b_source_new',
    gitCommit: { author: { date: Date.now() } }
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
            definitionReference: { 
                version: { id: linkedArtifact_B_old.buildId, name: 'build_B' }, 
                definition : { id: linkedArtifact_B.buildDefinitionId },
                project: { name: PROJECT_NAME }
            },
            alias: 'artifact_B'
        }] 
    });

fakeWebApi.buildApi.getBuild
    .withArgs(PROJECT_NAME, linkedArtifact_A.buildId).returns({ 
        id: linkedArtifact_A.buildId,
        buildNumber: linkedArtifact_A.buildNumber,
        sourceVersion: linkedArtifact_A.sourceVersion,
        repository: { id: linkedArtifact_A.repoId },
        project: { name: PROJECT_NAME },
        definition: { id: linkedArtifact_A.buildDefinitionId, name: linkedArtifact_A.buildName },
        sourceBranch: 'master'
    });
fakeWebApi.buildApi.getBuild
    .withArgs(PROJECT_NAME, linkedArtifact_B_old.buildId).returns({ 
        id: linkedArtifact_B_old.buildId,
        buildNumber: linkedArtifact_B_old.buildNumber,
        sourceVersion: linkedArtifact_B_old.sourceVersion,
        repository: { id: linkedArtifact_B.repoId },
        project: { name: PROJECT_NAME },
        definition: { id: linkedArtifact_B.buildDefinitionId, name: linkedArtifact_B.buildName },
        sourceBranch: 'master'
    });
fakeWebApi.buildApi.getBuild
    .withArgs(PROJECT_NAME, linkedArtifact_B_new.buildId).returns({ 
        id: linkedArtifact_B_new.buildId,
        buildNumber: linkedArtifact_B_new.buildNumber,
        sourceVersion: linkedArtifact_B_new.sourceVersion,
        repository: { id: linkedArtifact_B.repoId },
        project: { name: PROJECT_NAME },
        definition: { id: linkedArtifact_B.buildDefinitionId, name: linkedArtifact_B.buildName },
        sourceBranch: 'master',
        status: BuildStatus.InProgress
    });

// these are the statuses that create a dependency between the artifacts
fakeWebApi.gitApi.getStatuses.withArgs(linkedArtifact_A.sourceVersion, linkedArtifact_A.repoId, PROJECT_NAME).returns([
    { context: { genre: 'continuous-integration' }, targetUrl: `source_two.com/${linkedArtifact_B_new.buildId}`}
]);
fakeWebApi.gitApi.getStatuses.withArgs(linkedArtifact_B_old.sourceVersion, linkedArtifact_B.repoId, PROJECT_NAME).returns([]);

fakeWebApi.gitApi.getCommit
    .withArgs(linkedArtifact_B_old.sourceVersion, linkedArtifact_B.repoId, PROJECT_NAME)
    .returns(new Promise((resolve) => resolve(linkedArtifact_B_old.gitCommit)));
fakeWebApi.gitApi.getCommit
    .withArgs(linkedArtifact_B_new.sourceVersion, linkedArtifact_B.repoId, PROJECT_NAME)
    .returns(new Promise((resolve) => resolve(linkedArtifact_B_new.gitCommit)))

process.env['SYSTEM_TEAMFOUNDATIONCOLLECTIONURI'] = 'FakeUri';
process.env['RELEASE_RELEASEID'] = '' + RELEASE_ID;
process.env['SYSTEM_TEAMPROJECT'] = PROJECT_NAME;
process.env['SYSTEM_ACCESSTOKEN'] = 'AccessKey';

tmr.run();