import * as path from 'path';
import * as assert from 'assert';
import * as ttm from 'azure-pipelines-task-lib/mock-test';

describe('Inconsistent Release Tests', function (){

    it('should fail when a dependent artifact is still building',function(done:Mocha.Done){
        const tp = path.join(__dirname, 'inconsistentReleases', 'two_dependent_artifacts_one_still_building.js');
        const tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);
        tr.run();

        assert.strictEqual(tr.failed, true);
        assert.strictEqual(tr.stdout.indexOf('Detected build with status InProgress') >= 0, true);
        
        done();
    });

    it('should fail when a dependent artifacts build has failed',function(done:Mocha.Done){
        const tp = path.join(__dirname, 'inconsistentReleases', 'two_dependent_artifacts_one_build_failed.js');
        const tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);
        tr.run();

        assert.strictEqual(tr.failed, true);
        assert.strictEqual(tr.stdout.indexOf('Detected failed build build_b - build_for_artifact_b_new') >= 0, true);
        
        done();
    });

    it('should fail when a new version of an inconsistent pair of artifacts is released', function(done:Mocha.Done) {
        /* 
        Consider a single commit, C1, that generates two builds; BuildA_1 and BuildB_1.
        BuildA is a considerably faster build than BuildB. BuildA_1 completes and triggers a release, R1. R1 is detected as inconsistent whilst BuildB_1 is still InProgress.
        Another commit, C2, occurs triggering BuildA_2. 
        BuildA_2 completes before BuildB_1 triggering a release, R2. R2 should still be inconsistent as C2 includes changes made in C1, therefore the changes in BuildB_1 are required for consistency.
        Only when BuildB_1 completes and triggers a new release, R3, will the release be consistent.
         */
        const tp = path.join(__dirname, 'inconsistentReleases', 'new_artifact_in_already_inconsistent_release.js');
        const tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);
        tr.run();

        assert.strictEqual(tr.failed, true); //TODO::
        done();
    });
});
