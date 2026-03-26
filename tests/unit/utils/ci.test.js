import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { isCI, getCIProvider, formatForCI, getExitCode } from '../../../src/utils/ci.js';

describe('CI Utils', () => {
  let originalEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
    delete process.env.CI;
    delete process.env.GITHUB_ACTIONS;
    delete process.env.GITLAB_CI;
    delete process.env.CIRCLECI;
    delete process.env.TRAVIS;
    delete process.env.JENKINS_URL;
    delete process.env.BUILDKITE;
    delete process.env.TF_BUILD;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('isCI', () => {
    it('should return false when no CI env vars are set', () => {
      delete process.env.CI;
      delete process.env.GITHUB_ACTIONS;
      delete process.env.GITLAB_CI;
      
      expect(isCI()).toBe(false);
    });

    it('should return true when CI env var is set', () => {
      process.env.CI = 'true';
      expect(isCI()).toBe(true);
    });

    it('should return true when GITHUB_ACTIONS is set', () => {
      process.env.GITHUB_ACTIONS = 'true';
      expect(isCI()).toBe(true);
    });

    it('should return true when GITLAB_CI is set', () => {
      process.env.GITLAB_CI = 'true';
      expect(isCI()).toBe(true);
    });

    it('should return true when CIRCLECI is set', () => {
      process.env.CIRCLECI = 'true';
      expect(isCI()).toBe(true);
    });

    it('should return true when TRAVIS is set', () => {
      process.env.TRAVIS = 'true';
      expect(isCI()).toBe(true);
    });

    it('should return true when JENKINS_URL is set', () => {
      process.env.JENKINS_URL = 'http://jenkins.example.com';
      expect(isCI()).toBe(true);
    });

    it('should return true when BUILDKITE is set', () => {
      process.env.BUILDKITE = 'true';
      expect(isCI()).toBe(true);
    });

    it('should return true when TF_BUILD is set', () => {
      process.env.TF_BUILD = 'true';
      expect(isCI()).toBe(true);
    });
  });

  describe('getCIProvider', () => {
    it('should return "Unknown" when not in CI', () => {
      delete process.env.CI;
      delete process.env.GITHUB_ACTIONS;
      
      expect(getCIProvider()).toBe('Unknown');
    });

    it('should return "GitHub Actions" when GITHUB_ACTIONS is set', () => {
      process.env.GITHUB_ACTIONS = 'true';
      expect(getCIProvider()).toBe('GitHub Actions');
    });

    it('should return "GitLab CI" when GITLAB_CI is set', () => {
      process.env.GITLAB_CI = 'true';
      expect(getCIProvider()).toBe('GitLab CI');
    });

    it('should return "CircleCI" when CIRCLECI is set', () => {
      process.env.CIRCLECI = 'true';
      expect(getCIProvider()).toBe('CircleCI');
    });

    it('should return "Travis CI" when TRAVIS is set', () => {
      process.env.TRAVIS = 'true';
      expect(getCIProvider()).toBe('Travis CI');
    });

    it('should return "Jenkins" when JENKINS_URL is set', () => {
      process.env.JENKINS_URL = 'http://jenkins.example.com';
      expect(getCIProvider()).toBe('Jenkins');
    });

    it('should return "Buildkite" when BUILDKITE is set', () => {
      process.env.BUILDKITE = 'true';
      expect(getCIProvider()).toBe('Buildkite');
    });

    it('should return "Azure Pipelines" when TF_BUILD is set', () => {
      process.env.TF_BUILD = 'true';
      expect(getCIProvider()).toBe('Azure Pipelines');
    });

    it('should return "CI" when only CI is set', () => {
      process.env.CI = 'true';
      expect(getCIProvider()).toBe('CI');
    });

    it('should prioritize specific providers over generic CI', () => {
      process.env.CI = 'true';
      process.env.GITHUB_ACTIONS = 'true';
      expect(getCIProvider()).toBe('GitHub Actions');
    });
  });

  describe('formatForCI', () => {
    it('should return message unchanged when not in CI', () => {
      delete process.env.CI;
      const message = '🚀 Test message with emoji';
      expect(formatForCI(message)).toBe(message);
    });

    it('should remove emojis in CI environment', () => {
      process.env.CI = 'true';
      const message = '🚀 Test message 🔍 with emojis 📊';
      const result = formatForCI(message);
      
      expect(result).not.toContain('🚀');
      expect(result).not.toContain('🔍');
      expect(result).not.toContain('📊');
      expect(result).toContain('Test message');
      expect(result).toContain('with emojis');
    });

    it('should replace box drawing characters in CI', () => {
      process.env.CI = 'true';
      const message = '┌─┬─┐\n│ │ │\n├─┼─┤\n└─┴─┘';
      const result = formatForCI(message);
      
      expect(result).not.toContain('┌');
      expect(result).not.toContain('│');
      expect(result).not.toContain('─');
      expect(result).toContain('-');
    });

    it('should trim whitespace', () => {
      process.env.CI = 'true';
      const message = '  Test message  ';
      const result = formatForCI(message);
      
      expect(result).toBe('Test message');
    });
  });

  describe('getExitCode', () => {
    it('should return 0 when not in CI', () => {
      delete process.env.CI;
      const snapshots = [
        { driftScore: 0.5 }
      ];
      
      expect(getExitCode(snapshots, 0.3)).toBe(0);
    });

    it('should return 0 when no drift detected in CI', () => {
      process.env.CI = 'true';
      const snapshots = [
        { driftScore: 0.1 },
        { driftScore: 0.2 }
      ];
      
      expect(getExitCode(snapshots, 0.3)).toBe(0);
    });

    it('should return 1 when drift detected in CI', () => {
      process.env.CI = 'true';
      const snapshots = [
        { driftScore: 0.1 },
        { driftScore: 0.5 }
      ];
      
      expect(getExitCode(snapshots, 0.3)).toBe(1);
    });

    it('should handle snapshots without drift scores', () => {
      process.env.CI = 'true';
      const snapshots = [
        { id: 'snap1' },
        { id: 'snap2' }
      ];
      
      expect(getExitCode(snapshots, 0.3)).toBe(0);
    });

    it('should use custom threshold', () => {
      process.env.CI = 'true';
      const snapshots = [
        { driftScore: 0.4 }
      ];
      
      expect(getExitCode(snapshots, 0.5)).toBe(0);
      expect(getExitCode(snapshots, 0.3)).toBe(1);
    });

    it('should handle empty snapshots array', () => {
      process.env.CI = 'true';
      expect(getExitCode([], 0.3)).toBe(0);
    });
  });
});
