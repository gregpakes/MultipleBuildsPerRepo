// import tl = require('azure-pipelines-task-lib/task');

// async function run() {
//     try {
//         const inputString: string | undefined = tl.getInput('samplestring', true);
//         if (inputString == 'bad') {
//             tl.setResult(tl.TaskResult.Failed, 'Bad input was given');
//             return;
//         }
//         console.log('Hello', inputString);
//     }
//     catch (err: any) {
//         tl.setResult(tl.TaskResult.Failed, err.message);
//     }
// }

// run();

import * as tl from 'azure-pipelines-task-lib/task';
import * as vstsInterfaces from "azure-devops-node-api/interfaces/common/VsoBaseInterfaces";
import * as util from "./UtilFunctions";
import * as webApi from "azure-devops-node-api/WebApi";
import { IReleaseApi } from "azure-devops-node-api/ReleaseApi";
import { IBuildApi } from "azure-devops-node-api/BuildApi";
import { BuildResult, BuildStatus } from "azure-devops-node-api/interfaces/BuildInterfaces";
import { IGitApi } from "azure-devops-node-api/GitApi";
import { GitStatus } from "azure-devops-node-api/interfaces/GitInterfaces";
import { ReleaseStatus, ReleaseUpdateMetadata } from "azure-devops-node-api/interfaces/ReleaseInterfaces";


import taskJson from "../task.json";
const area = "CheckBuildsCompleted";

function getDefaultProps() {
    const hostType = (tl.getVariable("SYSTEM.HOSTTYPE") || "").toLowerCase();
    return {
        hostType: hostType,
        definitionName: hostType === "release" ? tl.getVariable("RELEASE.DEFINITIONNAME") : tl.getVariable("BUILD.DEFINITIONNAME"),
        processId: hostType === "release" ? tl.getVariable("RELEASE.RELEASEID") : tl.getVariable("BUILD.BUILDID"),
        processUrl: hostType === "release" ? tl.getVariable("RELEASE.RELEASEWEBURL") : ((tl.getVariable("SYSTEM.TEAMFOUNDATIONSERVERURI") || "") + tl.getVariable("SYSTEM.TEAMPROJECT") + "/_build?buildId=" + tl.getVariable("BUILD.BUILDID")),
        taskDisplayName: tl.getVariable("TASK.DISPLAYNAME"),
        jobid: tl.getVariable("SYSTEM.JOBID"),
        agentVersion: tl.getVariable("AGENT.VERSION"),
        version: taskJson.version
    };
}

function publishEvent(feature : string, properties: any): void {
    try {
        const splitVersion = (process.env.AGENT_VERSION || "").split(".");
        const major = parseInt(splitVersion[0] || "0");
        const minor = parseInt(splitVersion[1] || "0");
        let telemetry = "";
        if (major > 2 || (major === 2 && minor >= 120)) {
            telemetry = `##vso[telemetry.publish area=${area};feature=${feature}]${JSON.stringify(Object.assign(getDefaultProps(), properties))}`;
        }
        else {
            if (feature === "reliability") {
                const reliabilityData = properties;
                telemetry = "##vso[task.logissue type=error;code=" + reliabilityData.issueType + ";agentVersion=" + tl.getVariable("Agent.Version") + ";taskId=" + area + "-" + JSON.stringify(taskJson.version) + ";]" + reliabilityData.errorMessage;
            }
        }
        console.log(telemetry);
    }
    catch (err) {
        tl.warning("Failed to log telemetry, error: " + err);
    }
}

async function run(): Promise<void>  {
    // eslint-disable-next-line no-async-promise-executor
    const promise = new Promise<void>(async (resolve, reject) => {

        try {
            const tpcUri = tl.getVariable("System.TeamFoundationCollectionUri");
            const releaseId: number = parseInt(tl.getVariable("Release.ReleaseId") || "0");
            const teamProject = tl.getVariable("System.TeamProject");

            // Validation
            if (tpcUri === undefined){
                throw "Unable to get variable [System.TeamFoundationCollectionUri]";
            }

            if (releaseId === 0){
                throw "Unable to get variable [Release.ReleaseId]";
            }

            if (teamProject === undefined){
                throw "Unable to get variable [System.TeamProject]";
            }

            const credentialHandler: vstsInterfaces.IRequestHandler = util.getCredentialHandler();
            const vsts = new webApi.WebApi(tpcUri, credentialHandler);
            const releaseApi: IReleaseApi = await vsts.getReleaseApi();
            const buildApi: IBuildApi = await vsts.getBuildApi();
            const gitApi: IGitApi = await vsts.getGitApi();

            console.log("Getting the current release details");
            const currentRelease = await releaseApi.getRelease(teamProject, releaseId);

            if (!currentRelease) {
                throw `Unable to locate the current release with id ${releaseId}`;
            }

            if (!currentRelease.artifacts){
                throw `Unable to locate artifacts in current release with id ${releaseId}`;
            }

            const artifactsInThisRelease = util.getBuildArtifacts(currentRelease.artifacts);

            for (const artifact of artifactsInThisRelease) {

                if (!artifact.definitionReference){
                    throw `Unable to locate the [definitionreference] of the artifact ${artifact.alias}`;
                }

                console.log(`Artifact: [${artifact.alias}] - ${artifact.definitionReference.version.name}`);

                const buildId = artifact.definitionReference.version.id;

                if (!buildId){
                    throw `Unable to locate the [buildId] of the artifact ${artifact.alias}`;
                }

                const build = await buildApi.getBuild(teamProject, parseInt(buildId));

                if (build) {
                    console.log(`\tBuild ${build.buildNumber} was built from commit: ${build.sourceVersion}`);

                    // Get the commit for this build
                    tl.debug("\tGetting statuses...");
                    tl.debug(`\t\tBuild Source Version: ${build.sourceVersion}`);
                    tl.debug(`\t\tBuild Repository Id: ${build.repository?.id}`);
                    tl.debug(`\t\tBuild Project Name: ${build.project?.name}`);
                    const statuses = await gitApi.getStatuses(build.sourceVersion || "", build.repository?.id || "", build.project?.name, 1000, 0, false);
                    tl.debug("\tDone.");

                    let buildStatuses: GitStatus[] = [];
                    if (statuses) {
                        // Get the build statuses
                        buildStatuses = statuses.filter(status => status.context?.genre === "continuous-integration");
                    } else {
                        buildStatuses = [];
                    }

                    // remove duplicates
                    buildStatuses = buildStatuses.filter((thing, index, self) =>
                        index === self.findIndex((t) => (
                        t.targetUrl === thing.targetUrl
                        ))
                    );

                    console.log(`\tFound ${buildStatuses.length} other builds`);

                    for (let i = 0; i < buildStatuses.length; i++) {
                        const buildStatus = buildStatuses[i];
                        const buildFromStatus = await util.getBuildFromTargetUrl(buildApi, buildStatus.targetUrl || "", build.project?.name || "");

                        if (!buildFromStatus || !buildFromStatus.definition) {
                            console.log(`Unable to locate build from the status.`)
                            continue;
                        }

                        // Check that this build definition is actually an artifact
                        if (!util.buildDefinitionExistsInArtifacts(buildFromStatus.definition.id || 0, artifactsInThisRelease)) {
                            console.log(`\t - Skipping build definition ${buildFromStatus.definition?.name} - ${buildFromStatus.buildNumber} as it is not an artifact in this release.`);
                            continue;
                        }

                        if (build.definition?.id === buildFromStatus.definition.id) {
                            console.log(`\t - Skipping build definition ${buildFromStatus.definition.name} - ${buildFromStatus.buildNumber} as we already have the artifact for this build.`);
                            continue;
                        }

                        if (build.sourceBranch !== buildFromStatus.sourceBranch) {
                            console.log(`\t - Skipping build definition ${buildFromStatus.definition.name} - ${buildFromStatus.buildNumber}.  Expected branch ${build.sourceBranch}, found ${buildFromStatus.sourceBranch}.`);
                            continue;
                        }

                        if (util.buildExistsInArtifacts(buildFromStatus, artifactsInThisRelease)) {
                            console.log(`\t - Skipping build definition ${buildFromStatus.definition.name} - ${buildFromStatus.buildNumber}.  This build is already an artifact.`);
                            continue;
                        }

                        // We need to check that the actual artifact corresponding to this build is not newer than this build
                        if (await util.isBuildNewerThanArtifact(gitApi, buildApi, buildFromStatus, artifactsInThisRelease) === false) {
                            console.log(`\t - Skipping build definition ${buildFromStatus.definition.name} - ${buildFromStatus.buildNumber}. The build in the artifact is newer than this build.`);
                            continue;
                        }

                        console.log(`\t - Found: ${buildFromStatus.definition?.name} - ${buildFromStatus.buildNumber}`);

                        if (!buildFromStatus.status) {
                            throw `Detected build with unknown status ${buildFromStatus.id}`;
                        }

                        // Check the build status
                        if (buildFromStatus.status !== 2) { // Completed                            
                            const statusOfBuild = BuildStatus[buildFromStatus.status];
                            console.log(`\t - Status: ${statusOfBuild}`);
                            throw  `Detected build with status ${statusOfBuild}`;
                        }

                        if (!buildFromStatus.result) {
                            throw `Detected build with unknown result ${buildFromStatus.id}`;
                        }

                        const buildResult = BuildResult[buildFromStatus.result];
                        if (!buildResult) {
                            throw `Failed to parse the build result [${buildFromStatus.result}]... failing`;
                        }

                        console.log(`\t - Status: ${buildResult}`);

                        if (buildFromStatus.result === 8) {
                            throw `Detected failed build ${buildFromStatus.definition.name} - ${buildFromStatus.buildNumber} - Status: ${buildResult}`;
                        }
                    }
                } else {
                    console.log(`Failed to locate build id [${buildId}]`);
                }
            }
            resolve();
        } catch (err : any) {            
            tl.error(err);
            reject(err);
        }
    });

    return promise;
}

run()
    .then((result) => {
            tl.setResult(tl.TaskResult.Succeeded, "");
        }
    )
    .catch(async (err) => {
        publishEvent("reliability", { issueType: "error", errorMessage: JSON.stringify(err, Object.getOwnPropertyNames(err)) });
        tl.setResult(tl.TaskResult.Failed, err);

        // try {
        //     // Attempt to abandon release
        //     const abandonOnFailure = tl.getBoolInput("abandonreleaseonfailure");

        //     if (abandonOnFailure) {
        //         const tpcUri = tl.getVariable("System.TeamFoundationCollectionUri");
        //         const releaseId: number = parseInt(tl.getVariable("Release.ReleaseId") || "0");
        //         const teamProject = tl.getVariable("System.TeamProject");

        //         // Validation
        //         if (tpcUri === undefined){
        //             reject("Unable to get variable [System.TeamFoundationCollectionUri]");
        //             return;
        //         }

        //         if (releaseId === 0){
        //             reject("Unable to get variable [Release.ReleaseId]");
        //             return;
        //         }

        //         if (teamProject === undefined){
        //             reject("Unable to get variable [System.TeamProject]");
        //             return;
        //         }

        //         const credentialHandler: vstsInterfaces.IRequestHandler = util.getCredentialHandler();
        //         const vsts = new webApi.WebApi(tpcUri, credentialHandler);
        //         const releaseApi: IReleaseApi = await vsts.getReleaseApi();

        //         const metatdata: ReleaseUpdateMetadata = <ReleaseUpdateMetadata>
        //         {
        //             comment: "Abandoned by [Check Artifact Consistency Task]",
        //             status: ReleaseStatus.Abandoned
        //         };

        //         await releaseApi.updateReleaseResource(metatdata, teamProject, releaseId);

        //         console.log(`Abandoned release.`);
        //         resolve("Abandoned Release");
        //     }
        // } catch (abandonErr) {
        //     reject(err);
        // }
    });