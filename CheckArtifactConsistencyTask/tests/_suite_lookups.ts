import * as path from 'path';
import * as assert from 'assert';
import * as ttm from 'azure-pipelines-task-lib/mock-test';

describe('Lookup Tests', function (){

    it('should fail if the release ID cant be found', function (done: Mocha.Done){
        const tp = path.join(__dirname, 'lookups', 'release_id_not_found.js');
        const tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);
        tr.run();

        assert.strictEqual(tr.failed, true, 'should have failed');
        assert.strictEqual(tr.stdout.indexOf('Unable to locate the current release with id ') >= 0, true);
        done();
    });

    it('should fail if the release artifacts cant be found', function (done: Mocha.Done){
        const tp = path.join(__dirname, 'lookups', 'release_artifacts_not_found.js');
        const tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);
        tr.run();

        assert.strictEqual(tr.failed, true, 'should have failed');
        assert.strictEqual(tr.stdout.indexOf('Unable to locate artifacts in current release with id ') >= 0, true);
        done();
    });
});
