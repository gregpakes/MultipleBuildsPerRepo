import * as path from 'path';
import * as assert from 'assert';
import * as ttm from 'azure-pipelines-task-lib/mock-test';

describe('Input Tests', function (){

    it('should fail System.TeamFoundationCollectionUri is not supplied', function (done: Mocha.Done){
        const tp = path.join(__dirname, 'inputs', 'System_TeamFoundationCollectionUriNotProvided.js');
        const tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);
        tr.run();
        assert.strictEqual(tr.failed, true, 'should have failed');
        assert.strictEqual(tr.stdout.indexOf('Unable to get variable [System.TeamFoundationCollectionUri]') >= 0, true, 'Should contain: Unable to get variable [System.TeamFoundationCollectionUri]');
        done();
    });

    it('should fail Release.ReleaseIdNotProvided is not supplied', function (done: Mocha.Done){
        const tp = path.join(__dirname, 'inputs', 'Release_ReleaseIdNotProvided.js');
        const tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);
        tr.run();
        
        assert.strictEqual(tr.failed, true, 'should have failed');
        assert.strictEqual(tr.stdout.indexOf('Unable to get variable [Release.ReleaseId]') >= 0, true, 'Should contain: Unable to get variable [Release.ReleaseId]');
        done();
    });

    it('should fail System.TeamProject is not supplied', function (done: Mocha.Done){
        const tp = path.join(__dirname, 'inputs', 'System_TeamProjectNotProvided.js');
        const tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);
        tr.run();
        
        assert.strictEqual(tr.failed, true, 'should have failed');
        assert.strictEqual(tr.stdout.indexOf('Unable to get variable [System.TeamProject]') >= 0, true, 'Should contain: Unable to get variable [System.TeamProject]');
        done();
    });

    it('should fail System.AccessToken is not supplied', function (done: Mocha.Done){
        const tp = path.join(__dirname, 'inputs', 'System_AccessTokenNotProvided.js');
        const tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);
        tr.run();
        
        assert.strictEqual(tr.failed, true, 'should have failed');
        assert.strictEqual(tr.stdout.indexOf('Unable to locate access token') >= 0, true, 'Should contain: Unable to locate access token');
        done();
        
    });

});
