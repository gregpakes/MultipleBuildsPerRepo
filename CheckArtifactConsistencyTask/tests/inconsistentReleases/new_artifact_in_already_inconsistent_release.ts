// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { BuildResult, BuildStatus } from 'azure-devops-node-api/interfaces/BuildInterfaces';
import tmrm = require('azure-pipelines-task-lib/mock-run');
import path = require('path');
import fakeWebApi = require("../FakeWebApi");

const taskPath = path.join(__dirname, '..', '..', 'src', 'CheckArtifactConsistencyTask.js');
const tmr: tmrm.TaskMockRunner = new tmrm.TaskMockRunner(taskPath);

const RELEASE_R1 = 99;  // First artifact from commit C1 triggers... Artifacts: A1 and B0
const RELEASE_R2 = 100; // Artifact from commit C2 triggers... Artifacts: A2 and B0
const PROJECT_NAME = 'TestProject';

const gitCommit_C0 = { 
    author: { date: Date.now() - 100 } 
};

const gitCommit_C1 = { 
    author: { date: Date.now() - 1 } 
};

const gitCommit_C2 = { 
    author: { date: Date.now() } 
};


const linkedArtifact_A = {
    buildDefinitionId: 77001,
    buildName: 'build_a',
    repoId: 'repo_a'
}

// Artifact A from commit C1
const linkedArtifact_A_C1 = {
    buildId: 100001,
    buildNumber: 'build_a_c1',
    sourceVersion: 'c1',
    gitCommit: gitCommit_C1
}

// Artifact  from commit C2
const linkedArtifact_A_C2 = {
    buildId: 100003,
    buildNumber: 'build_a_c2',
    sourceVersion: 'c2',
    gitCommit: gitCommit_C2
}

const linkedArtifact_B = {
    buildDefinitionId: 77002,
    buildName: 'build_b',
    repoId: 'repo_b'
}

// Artifact B prior to commit C1
const linkedArtifact_B_C0 = {
    buildId: 100000,
    buildNumber: 'build_b_c0',
    sourceVersion: 'c0',
    gitCommit: gitCommit_C0
}

// Artifact B from commit C1
const linkedArtifact_B_C1 = {
    buildId: 100002,
    buildNumber: 'build_b_c1',
    sourceVersion: 'c1',
    gitCommit: gitCommit_C1
}

fakeWebApi.initStub(tmr);

fakeWebApi.releaseApi.getRelease
    .withArgs(PROJECT_NAME, RELEASE_R1)
    .returns({ 
        artifacts: [{
            type: 'Build',
            definitionReference: { 
                version: { id: linkedArtifact_A_C1.buildId, name: 'build_A' }, 
                definition : { id: linkedArtifact_A.buildDefinitionId},
                project: { name: PROJECT_NAME }
            },
            alias: 'artifact_A'
        }, {
            type: 'Build',
            definitionReference: { 
                version: { id: linkedArtifact_B_C0.buildId, name: 'build_B' }, 
                definition : { id: linkedArtifact_B.buildDefinitionId },
                project: { name: PROJECT_NAME }
            },
            alias: 'artifact_B'
        }] 
    });

fakeWebApi.releaseApi.getRelease
    .withArgs(PROJECT_NAME, RELEASE_R2)
    .returns({ 
        artifacts: [{
            type: 'Build',
            definitionReference: { 
                version: { id: linkedArtifact_A_C2.buildId, name: 'build_A' }, 
                definition : { id: linkedArtifact_A.buildDefinitionId},
                project: { name: PROJECT_NAME }
            },
            alias: 'artifact_A'
        }, {
            type: 'Build',
            definitionReference: { 
                version: { id: linkedArtifact_B_C0.buildId, name: 'build_B' }, 
                definition : { id: linkedArtifact_B.buildDefinitionId },
                project: { name: PROJECT_NAME }
            },
            alias: 'artifact_B'
        }] 
    });

// BuildB_0 completed ages ago. Is around when A1 triggers R1
fakeWebApi.buildApi.getBuild
    .withArgs(PROJECT_NAME, linkedArtifact_B_C0.buildId).returns({ 
        id: linkedArtifact_B_C0.buildId,
        buildNumber: linkedArtifact_B_C0.buildNumber,
        sourceVersion: linkedArtifact_B_C0.sourceVersion,
        repository: { id: linkedArtifact_B.repoId },
        project: { name: PROJECT_NAME },
        definition: { id: linkedArtifact_B.buildDefinitionId, name: linkedArtifact_B.buildName },
        sourceBranch: 'master',
        status: BuildStatus.Completed,
        result: BuildResult.Succeeded
    });

// BuildA_1 completed, triggering R1.
fakeWebApi.buildApi.getBuild
    .withArgs(PROJECT_NAME, linkedArtifact_A_C1.buildId).returns({ 
        id: linkedArtifact_A_C1.buildId,
        buildNumber: linkedArtifact_A_C1.buildNumber,
        sourceVersion: linkedArtifact_A_C1.sourceVersion,
        repository: { id: linkedArtifact_A.repoId },
        project: { name: PROJECT_NAME },
        definition: { id: linkedArtifact_A.buildDefinitionId, name: linkedArtifact_A.buildName },
        sourceBranch: 'master',
        status: BuildStatus.Completed,
        result: BuildResult.Succeeded
    });

// BuildB_1 is InProgress - a very slow build.
fakeWebApi.buildApi.getBuild
    .withArgs(PROJECT_NAME, linkedArtifact_B_C1.buildId).returns({ 
        id: linkedArtifact_B_C1.buildId,
        buildNumber: linkedArtifact_B_C1.buildNumber,
        sourceVersion: linkedArtifact_B_C1.sourceVersion,
        repository: { id: linkedArtifact_B.repoId },
        project: { name: PROJECT_NAME },
        definition: { id: linkedArtifact_B.buildDefinitionId, name: linkedArtifact_B.buildName },
        sourceBranch: 'master',
        status: BuildStatus.InProgress
    });

// BuildA_2 completed, triggering R2
fakeWebApi.buildApi.getBuild
    .withArgs(PROJECT_NAME, linkedArtifact_A_C2.buildId).returns({ 
        id: linkedArtifact_A_C2.buildId,
        buildNumber: linkedArtifact_A_C2.buildNumber,
        sourceVersion: linkedArtifact_A_C2.sourceVersion,
        repository: { id: linkedArtifact_A.repoId },
        project: { name: PROJECT_NAME },
        definition: { id: linkedArtifact_A.buildDefinitionId, name: linkedArtifact_A.buildName },
        sourceBranch: 'master',
        status: BuildStatus.Completed,
        result: BuildResult.Succeeded
    });


// these are the statuses that create a dependency between the artifacts
fakeWebApi.gitApi.getStatuses
    .withArgs(linkedArtifact_A_C1.sourceVersion, linkedArtifact_A.repoId, PROJECT_NAME).returns([
    { context: { genre: 'continuous-integration' }, targetUrl: `source_two.com/${linkedArtifact_B_C1.buildId}`}
]);
fakeWebApi.gitApi.getStatuses.withArgs(linkedArtifact_B_C1.sourceVersion, linkedArtifact_B.repoId, PROJECT_NAME).returns([
    { context: { genre: 'continuous-integration' }, targetUrl: `source_two.com/${linkedArtifact_A_C1.buildId}`}
]);
// A_C2 returns no dependent builds
fakeWebApi.gitApi.getStatuses.withArgs(linkedArtifact_A_C2.sourceVersion, linkedArtifact_A.repoId, PROJECT_NAME).returns([
]);

fakeWebApi.gitApi.getCommit
    .withArgs(linkedArtifact_A_C1.sourceVersion, linkedArtifact_A.repoId, PROJECT_NAME)
    .returns(new Promise((resolve) => resolve(linkedArtifact_A_C1.gitCommit)));
fakeWebApi.gitApi.getCommit
    .withArgs(linkedArtifact_A_C2.sourceVersion, linkedArtifact_A.repoId, PROJECT_NAME)
    .returns(new Promise((resolve) => resolve(linkedArtifact_A_C2.gitCommit)));
fakeWebApi.gitApi.getCommit
    .withArgs(linkedArtifact_B_C0.sourceVersion, linkedArtifact_B.repoId, PROJECT_NAME)
    .returns(new Promise((resolve) => resolve(linkedArtifact_B_C0.gitCommit)));
fakeWebApi.gitApi.getCommit
    .withArgs(linkedArtifact_B_C1.sourceVersion, linkedArtifact_B.repoId, PROJECT_NAME)
    .returns(new Promise((resolve) => resolve(linkedArtifact_B_C1.gitCommit)));

process.env['SYSTEM_TEAMFOUNDATIONCOLLECTIONURI'] = 'FakeUri';
process.env['RELEASE_RELEASEID'] = '' + RELEASE_R2;
process.env['SYSTEM_TEAMPROJECT'] = PROJECT_NAME;
process.env['SYSTEM_ACCESSTOKEN'] = 'AccessKey';

tmr.run();