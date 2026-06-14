/**
 * Account page auth boot — classic (non-module) script for /account/.
 * Loaded from <head> with data-cfasync="false" so Cloudflare Rocket Loader does not
 * defer it. Handles password toggles, email sign-in, and Google OAuth return before
 * the Astro module bundle loads.
 */
(function () {
  'use strict';

  if (window.__accountInlineBootLoaded) return;
  window.__accountInlineBootLoaded = true;

  window.bsTogglePassword = function (inputId, btn) {
    var input = document.getElementById(inputId);
    if (!input || !btn) return;
    var show = input.type === 'password';
    input.type = show ? 'text' : 'password';
    btn.textContent = show ? 'Hide' : 'Show';
    btn.setAttribute('aria-label', (show ? 'Hide' : 'Show') + ' password');
    btn.setAttribute('aria-pressed', show ? 'true' : 'false');
    try {
      input.focus({ preventScroll: true });
    } catch (e) {}
  };

  var SESSION_KEY = 'bsAccountSession';

  function readApiBase() {
    var root = document.getElementById('admin-portal');
    var base =
      (root && root.dataset && root.dataset.publicApiBaseUrl) || 'https://api.brisbaneservers.com/api';
    return String(base).replace(/\/+$/, '');
  }

  function readAccountPath() {
    var root = document.getElementById('admin-portal');
    return (root && root.dataset && root.dataset.accountPath) || '/account/';
  }

  function usesCookieAuth(apiBase) {
    try {
      var host = new URL(apiBase).hostname;
      return host === 'brisbaneservers.com' || host.slice(-18) === '.brisbaneservers.com';
    } catch (e) {
      return false;
    }
  }

  function stashToken(token, apiBase) {
    if (!token || !String(token).trim()) return;
    var trimmed = String(token).trim();
    window.__accountSessionToken = trimmed;
    if (!usesCookieAuth(apiBase)) {
      try {
        sessionStorage.setItem(SESSION_KEY, trimmed);
      } catch (e) {}
    }
  }

  function showBanner(message, kind) {
    var banner = document.getElementById('auth-status-banner');
    if (!banner) return;
    banner.textContent = message;
    banner.style.display = 'block';
    banner.classList.remove(
      'auth-status-banner--success',
      'auth-status-banner--error',
      'auth-status-banner--info',
      'auth-status-banner--warning',
    );
    if (kind) banner.classList.add('auth-status-banner--' + kind);
  }

  function showLoginError(message) {
    var error = document.getElementById('login-error');
    if (error) {
      error.textContent = message;
      error.classList.add('show');
    } else {
      showBanner(message, 'error');
    }
  }

  function showDashboardShell(user) {
    var login = document.getElementById('login-screen');
    var dash = document.getElementById('admin-dashboard');
    if (login) login.style.display = 'none';
    if (dash) dash.style.display = 'block';
    var greeting = document.getElementById('workspace-greeting');
    if (greeting && user && user.email) {
      greeting.textContent = 'Welcome back, ' + user.email;
    }
    document.querySelectorAll('[data-account-link="true"]').forEach(function (link) {
      var semantic = link.querySelector('.semantic-text');
      if (semantic) semantic.textContent = 'Account';
      else link.textContent = 'Account';
      link.classList.add('nav-account-cta--signed-in');
    });
  }

  function authHeaders(token) {
    var headers = { Accept: 'application/json', 'Content-Type': 'application/json' };
    if (token) headers.Authorization = 'Bearer ' + token;
    return headers;
  }

  function fetchAuth(path, options) {
    return fetch(readApiBase() + path, Object.assign({ credentials: 'include' }, options || {}));
  }

  function parseJsonResponse(response) {
    return response
      .json()
      .catch(function () {
        return {};
      })
      .then(function (data) {
        return { response: response, data: data };
      });
  }

  document.addEventListener(
    'click',
    function (event) {
      var target = event.target;
      var toggle = target && target.closest ? target.closest('[data-password-toggle-target]') : null;
      if (!toggle) return;
      event.preventDefault();
      var inputId = toggle.getAttribute('data-password-toggle-target');
      if (!inputId) return;
      var input = document.getElementById(inputId);
      if (!input) return;
      var show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      toggle.textContent = show ? 'Hide' : 'Show';
      toggle.setAttribute('aria-label', (show ? 'Hide' : 'Show') + ' password');
      toggle.setAttribute('aria-pressed', show ? 'true' : 'false');
    },
    true,
  );

  function cleanAccountUrl() {
    history.replaceState({}, '', readAccountPath());
  }

  function verifySessionWithRetry(token, attempt) {
    return fetchAuth('/auth/me', { headers: authHeaders(token || null) }).then(function (response) {
      return parseJsonResponse(response).then(function (result) {
        if (result.response.ok && result.data.user) return result;
        if (attempt < 4 && (result.response.status === 401 || result.response.status >= 500)) {
          return new Promise(function (resolve) {
            window.setTimeout(function () {
              resolve(verifySessionWithRetry(token, attempt + 1));
            }, 600 * (attempt + 1));
          });
        }
        return result;
      });
    });
  }

  function handleOAuthReturn() {
    var params = new URLSearchParams(window.location.search);
    var hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    var token = hashParams.get('session');
    var oauthSuccess = params.get('oauth') === 'success';
    var oauthError = params.get('oauth_error');
    if (!oauthSuccess && !oauthError && !token) return;

    window.__accountOAuthInFlight = true;

    if (oauthError) {
      showBanner('Google sign-in failed. Try email sign-in or refresh the page.', 'error');
      cleanAccountUrl();
      window.__accountOAuthInFlight = false;
      return;
    }

    verifySessionWithRetry(token, 0)
      .then(function (result) {
        if (result.response.ok && result.data.user) {
          if (token) stashToken(token, readApiBase());
          window.__accountInlineOAuth = { user: result.data.user, token: token || null };
          cleanAccountUrl();
          showDashboardShell(result.data.user);
          return;
        }
        showBanner(
          'Google sign-in could not finish. Wait a moment and try Continue with Google again.',
          'error',
        );
      })
      .catch(function () {
        showBanner('Could not verify Google sign-in. Check your connection and try again.', 'error');
      })
      .finally(function () {
        window.__accountOAuthInFlight = false;
        window.__accountInlineBoot = true;
      });
  }

  function attachLoginFallback() {
    var form = document.getElementById('login-form');
    if (!form || form.dataset.inlineAuth === 'true') return;
    form.dataset.inlineAuth = 'true';

    form.addEventListener(
      'submit',
      function (event) {
        if (window.__accountAuthFormsBound) return;
        event.preventDefault();
        event.stopPropagation();
        var submitBtn = document.getElementById('login-submit-btn');
        var formData = new FormData(form);
        var email = String(formData.get('email') || '').trim();
        var password = String(formData.get('password') || '');
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.textContent = 'Signing in…';
        }
        fetchAuth('/auth/login', {
          method: 'POST',
          headers: authHeaders(null),
          body: JSON.stringify({ email: email, password: password }),
        })
          .then(parseJsonResponse)
          .then(function (result) {
            if (result.response.ok && result.data.success) {
              if (result.data.token) stashToken(result.data.token, readApiBase());
              try {
                localStorage.setItem('accountLastEmail', email.toLowerCase());
              } catch (e) {}
              window.__accountInlineLoggedIn = {
                user: result.data.user,
                token: result.data.token || null,
              };
              showDashboardShell(result.data.user);
              return;
            }
            showLoginError(result.data.error || 'Login failed');
          })
          .catch(function () {
            showLoginError('Connection error. Please try again.');
          })
          .finally(function () {
            if (submitBtn) {
              submitBtn.disabled = false;
              submitBtn.textContent = 'Sign in';
            }
          });
      },
      true,
    );
  }

  function stripSensitiveQueryParams() {
    try {
      var url = new URL(window.location.href);
      if (url.searchParams.has('password') || url.searchParams.has('email')) {
        url.searchParams.delete('password');
        url.searchParams.delete('email');
        history.replaceState({}, '', url.pathname + url.search + url.hash);
      }
    } catch (e) {}
  }

  function bootInline() {
    stripSensitiveQueryParams();
    handleOAuthReturn();
    attachLoginFallback();
    window.__accountInlineBoot = true;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootInline);
  } else {
    bootInline();
  }
})();
