import * as tl from "azure-pipelines-task-lib/task";
import webApi = require("azure-devops-node-api/WebApi");
import { IRequestHandler } from "azure-devops-node-api/interfaces/common/VsoBaseInterfaces";
import { Artifact } from "azure-devops-node-api/interfaces/ReleaseInterfaces";
import { Build } from "azure-devops-node-api/interfaces/BuildInterfaces";
import { IBuildApi } from "azure-devops-node-api/BuildApi";
import { IGitApi } from "azure-devops-node-api/GitApi";

// Gets the credential handler.  Supports both PAT and OAuth tokens
export function getCredentialHandler(): IRequestHandler {
    const accessToken: string = tl.getVariable("System.AccessToken") || "";
    let credHandler: IRequestHandler;
    if (!accessToken || accessToken.length === 0) {
        throw "Unable to locate access token.  Please make sure you have enabled the \"Allow scripts to access OAuth token\" setting.";
    } else {
        tl.debug("Creating the credential handler");
        // used for local debugging.  Allows switching between PAT token and Bearer Token for debugging
        credHandler = webApi.getHandlerFromToken(accessToken);
    }
    return credHandler;
}

export function getBuildArtifacts(artifacts: Artifact[]): Artifact[] {
    const result: Artifact[] = [];
    for (const artifact of artifacts) {
        if (artifact.type === "Build") {
            result.push(artifact);
        }
    }
    return result;
}

export async function getBuildFromTargetUrl(buildApi: IBuildApi, targetUrl: string, project: string): Promise<Build> {
    // Extract the build Id
    const buildId: number = parseInt(targetUrl.substring((targetUrl.lastIndexOf("/") + 1), targetUrl.length));
    return await buildApi.getBuild(project, buildId);
}

export function buildDefinitionExistsInArtifacts(buildDefinitionId: number, artifacts: Artifact[]): boolean {
    for (let i = 0; i < artifacts.length; i++) {
        const artifact = artifacts[i];
        if (parseInt(artifact.definitionReference?.definition?.id || "0") === buildDefinitionId) {
            return true;
        }
    }

    return false;
}

export function buildExistsInArtifacts(build: Build, artifacts: Artifact[]): boolean {
    for (let i = 0; i < artifacts.length; i++) {
        const artifact = artifacts[i];
        if (parseInt(artifact.definitionReference?.version.id || "0") === build.id) {
            return true;
        }
    }

    return false;
}

export async function isBuildNewerThanArtifact(gitApi: IGitApi, buildApi: IBuildApi, build: Build, artifacts: Artifact[]): Promise<boolean> {

    // eslint-disable-next-line no-async-promise-executor
    return new Promise<boolean>(async (resolve, reject) => {
        try {
            for (let i = 0; i < artifacts.length; i++) {
                const artifact = artifacts[i];

                if (!artifact.definitionReference){
                    reject(`Unable to locate the [definitionreference] of the artifact ${artifact.alias}`);
                    return;
                }

                if (!build.definition){
                    reject(`Unable to locate the [build.definition] of the build ${build.buildNumber}`);
                    return;
                }

                if (parseInt(artifact.definitionReference.definition.id || "0") === build.definition.id) {
                    // We have found the definition
                    const artifactBuildId = artifact.definitionReference.version.id || "0";
                    const artifactBuild = await buildApi.getBuild(artifact.definitionReference.project.name || "", parseInt(artifactBuildId));

                    const buildCommitPromise = gitApi.getCommit(build.sourceVersion || "", build.repository?.id || "", build.project?.name);
                    const artifactCommitPromise = gitApi.getCommit(artifactBuild.sourceVersion || "", artifactBuild.repository?.id || "", artifactBuild.project?.name);

                    await Promise.all([buildCommitPromise, artifactCommitPromise]).then(function(values) {
                        const buildCommit = values[0];
                        const artifactCommit = values[1];

                        if (!buildCommit || !artifactCommit || !buildCommit.author || !artifactCommit.author || !buildCommit.author.date || !artifactCommit.author.date) {
                            throw "Unable to locate commits correctly";
                        }

                        if (buildCommit.author.date > artifactCommit.author.date) {
                            resolve(true);
                        } else {
                            resolve(false);
                        }
                    }).catch(reason => {
                        reject(reason);
                    });
                }
            }
            resolve(true);
        } catch (err) {
            reject(err);
        }
    });
}