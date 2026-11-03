import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getSiteConfig } from '@/app/site';
import robots from '@/app/robots';
import sitemap from '@/app/sitemap';

describe('Landing SEO & Indexing Policy Boundaries', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('site config validation boundaries', () => {
    it.each([
      undefined,
      '',
      '   ',
      'not-a-valid-url',
      'ftp://origin.test',
      'http://user:pass@origin.test',
      'http://origin.test/subpath',
      'http://origin.test?query=1',
      'http://origin.test#fragment',
    ])('rejects invalid or non-bare SITE_URL: %s', (invalidUrl) => {
      if (invalidUrl === undefined) {
        delete process.env.SITE_URL;
      } else {
        process.env.SITE_URL = invalidUrl;
      }
      expect(() => getSiteConfig()).toThrow();
    });

    it.each(['staging', 'dev', 'prod', 'unknown'])(
      'rejects invalid DEPLOYMENT_ENV: %s',
      (invalidEnv) => {
        process.env.SITE_URL = 'http://127.0.0.1:4321';
        process.env.DEPLOYMENT_ENV = invalidEnv;
        expect(() => getSiteConfig()).toThrow();
      },
    );

    it.each([
      'not-a-url',
      'http://canonical.example',
      'https://user:pass@canonical.example',
      'https://canonical.example/path',
      'https://canonical.example?query=1',
      'https://canonical.example#hash',
    ])('rejects malformed or non-bare HTTPS APPROVED_SITE_URL: %s', (invalidApproved) => {
      process.env.SITE_URL = 'https://canonical.example';
      process.env.DEPLOYMENT_ENV = 'production';
      process.env.APPROVED_SITE_URL = invalidApproved;
      expect(() => getSiteConfig()).toThrow();
    });
  });

  describe('indexing decision table boundaries', () => {
    it.each([
      { env: 'local', siteUrl: 'http://127.0.0.1:4321', approved: undefined },
      { env: 'local', siteUrl: 'https://canonical.example', approved: 'https://canonical.example' },
      { env: 'preview', siteUrl: 'https://preview.test', approved: undefined },
      { env: 'preview', siteUrl: 'https://preview.test', approved: 'https://preview.test' },
      { env: 'production', siteUrl: 'http://insecure.test', approved: 'https://canonical.example' },
      { env: 'production', siteUrl: 'https://canonical.example', approved: undefined },
      { env: 'production', siteUrl: 'https://unapproved.example', approved: 'https://canonical.example' },
    ])(
      'enforces non-indexable policy for $env with $siteUrl (approved: $approved)',
      ({ env, siteUrl, approved }) => {
        process.env.SITE_URL = siteUrl;
        process.env.DEPLOYMENT_ENV = env;
        if (approved) {
          process.env.APPROVED_SITE_URL = approved;
        } else {
          delete process.env.APPROVED_SITE_URL;
        }

        const config = getSiteConfig();
        expect(config.shouldIndex).toBe(false);
        expect(config.isProductionApproved).toBe(false);
      },
    );

    it('enforces indexable policy only for production HTTPS matching approved origin', () => {
      const canonical = 'https://canonical.example';
      process.env.SITE_URL = canonical;
      process.env.DEPLOYMENT_ENV = 'production';
      process.env.APPROVED_SITE_URL = canonical;

      const config = getSiteConfig();
      expect(config.shouldIndex).toBe(true);
      expect(config.isProductionApproved).toBe(true);
      expect(config.siteUrl).toBe(canonical);
    });
  });

  describe('robots & sitemap contracts', () => {
    it('emits disallow root and references sitemap when indexing is false', () => {
      process.env.SITE_URL = 'http://127.0.0.1:4321';
      process.env.DEPLOYMENT_ENV = 'local';
      delete process.env.APPROVED_SITE_URL;

      const result = robots();
      expect(result.rules).toEqual({
        userAgent: '*',
        disallow: '/',
      });
      expect(result.sitemap).toBe('http://127.0.0.1:4321/sitemap.xml');
    });

    it('emits allow root and references sitemap when indexing is true', () => {
      const canonical = 'https://canonical.example';
      process.env.SITE_URL = canonical;
      process.env.DEPLOYMENT_ENV = 'production';
      process.env.APPROVED_SITE_URL = canonical;

      const result = robots();
      expect(result.rules).toEqual({
        userAgent: '*',
        allow: '/',
      });
      expect(result.sitemap).toBe(`${canonical}/sitemap.xml`);
    });

    it('emits canonical root route without unsupported lastModified date', () => {
      process.env.SITE_URL = 'http://127.0.0.1:4321';
      process.env.DEPLOYMENT_ENV = 'local';

      const items = sitemap();
      expect(items).toHaveLength(1);
      expect(items[0].url).toBe('http://127.0.0.1:4321/');
      expect(items[0].lastModified).toBeUndefined();
    });
  });
});
