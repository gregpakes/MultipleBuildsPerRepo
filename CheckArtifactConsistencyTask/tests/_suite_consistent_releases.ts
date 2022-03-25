import * as path from 'path';
import * as assert from 'assert';
import * as ttm from 'azure-pipelines-task-lib/mock-test';

describe('Consistent Release Tests', function (){

    it('should succeed when two dependent artifacts are consistent',function(done:Mocha.Done){
        const tp = path.join(__dirname, 'consistentReleases', 'two_dependent_artifacts_both_present.js');
        const tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);
        tr.run();

        assert.strictEqual(tr.succeeded, true);
        assert.strictEqual(tr.stdout.indexOf('Skipping build definition build_b - build_for_artifact_b.  This build is already an artifact.') >= 0, true);
        assert.strictEqual(tr.stdout.indexOf('Skipping build definition build_a - build_for_artifact_a.  This build is already an artifact.') >= 0, true);
        
        done();
    });

    it('should succeed when two independent artifacts make up the release',function(done:Mocha.Done){
        const tp = path.join(__dirname, 'consistentReleases', 'two_independent_artifacts.js');
        const tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);
        tr.run();

        assert.strictEqual(tr.succeeded, true);

        // "Found 0 other builds" should be found for each artifact
        const index = tr.stdout.indexOf('Found 0 other builds');
        assert.strictEqual(index >= 0, true);
        assert.strictEqual(tr.stdout.indexOf('Found 0 other builds', index + 1) >= 0, true);
        
        done();
    });

});
