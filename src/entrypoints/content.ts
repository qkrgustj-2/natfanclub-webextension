type VerifyResponse = {
  Verdict: string;
  IsSingaporeSite: boolean;
  Fail: boolean;
};

export default defineContentScript({
  matches: ['http://*/*', 'https://*/*'],
  main() {
    const isGoogleSearchPage =
      location.hostname.includes('google.') && location.pathname.startsWith('/search');
    if (!isGoogleSearchPage) return;

    const iconUrl = browser.runtime.getURL('/icon/16.png');
    const verificationImageUrls = {
      'Likely Accurate:true': browser.runtime.getURL('/verification_icon/Accurate-SG.svg'),
      'Likely Accurate:false': browser.runtime.getURL('/verification_icon/Accurate-NonSG.svg'),
      'Unverified:true': browser.runtime.getURL('/verification_icon/Unverified-SG.svg'),
      'Unverified:false': browser.runtime.getURL('/verification_icon/Unverified-NonSG.svg'),
      'Potentially Misleading:true': browser.runtime.getURL('/verification_icon/Misleading-SG.svg'),
      'Potentially Misleading:false': browser.runtime.getURL('/verification_icon/Misleading-NonSG.svg'),
    } as const;
    const verifyCache = new Map<string, Promise<VerifyResponse>>();

    const resetBadgeToDefaultLayout = (
      badge: HTMLElement,
      badgeIcon: HTMLImageElement,
      verifyLine: HTMLSpanElement,
    ) => {
      badge.style.display = 'inline-flex';
      badge.style.alignItems = 'center';
      badge.style.gap = '6px';
      badge.style.padding = '1px 4px';
      badge.style.background = '#fff';

      badgeIcon.style.display = '';
      badgeIcon.style.width = '14px';
      badgeIcon.style.height = '14px';
      badgeIcon.style.borderRadius = '3px';
      badgeIcon.style.objectFit = '';

      verifyLine.style.display = '';
    };

    const showImageBadge = (badge: HTMLElement, badgeIcon: HTMLImageElement, imageUrl: string) => {
      badge.style.display = 'inline-block';
      badge.style.padding = '0';
      badge.style.background = 'transparent';

      badgeIcon.src = imageUrl;
      badgeIcon.style.display = 'block';
      badgeIcon.style.width = 'auto';
      badgeIcon.style.height = '20px';
      badgeIcon.style.borderRadius = '0';
      badgeIcon.style.objectFit = 'contain';
    };

    const verifyUrl = (url: string) => {
      const cached = verifyCache.get(url);
      if (cached) return cached;

      const request = browser.runtime.sendMessage({
        type: 'verify-url',
        url,
      }) as Promise<VerifyResponse>;

      verifyCache.set(url, request);
      return request;
    };

    const createBadge = () => {
      const badge = document.createElement('span');
      badge.className = 'natfanclub-domain-badge';
      badge.style.display = 'inline-flex';
      badge.style.alignItems = 'center';
      badge.style.gap = '6px';
      badge.style.marginRight = '6px';
      badge.style.padding = '1px 4px';
      badge.style.border = 'none';
      badge.style.borderRadius = '12px';
      badge.style.background = '#fff';
      badge.style.fontSize = '12px';
      badge.style.lineHeight = '1.3';
      badge.style.color = '#374151';
      badge.style.maxWidth = '100%';

      const icon = document.createElement('img');
      icon.className = 'natfanclub-badge-icon';
      icon.src = iconUrl;
      icon.alt = '';
      icon.ariaHidden = 'true';
      icon.width = 14;
      icon.height = 14;
      icon.style.borderRadius = '3px';

      const verifyLine = document.createElement('span');
      verifyLine.className = 'natfanclub-verify-line';
      verifyLine.textContent = 'verifying...';
      verifyLine.style.fontSize = '12px';
      verifyLine.style.color = '#6b7280';
      verifyLine.style.wordBreak = 'break-word';

      badge.append(icon, verifyLine);
      return badge;
    };

    const injectDomainBadge = () => {
      const processedCards = new Set<HTMLElement>();
      const cites = document.querySelectorAll<HTMLElement>('#search cite');

      for (const cite of cites) {
        const resultCard =
          cite.closest<HTMLElement>('div.MjjYud, div.g, div[data-hveid]') ?? cite.parentElement;
        if (!resultCard || processedCards.has(resultCard)) continue;
        processedCards.add(resultCard);

        const heading = resultCard.querySelector<HTMLHeadingElement>('h3');
        if (!heading) continue;

        const anchor =
          heading.closest<HTMLAnchorElement>('a[href]') ??
          resultCard.querySelector<HTMLAnchorElement>('a[href]');
        const fullUrl = anchor?.href || '';
        if (!fullUrl) continue;

        const existingBadges = Array.from(
          resultCard.querySelectorAll<HTMLElement>('.natfanclub-domain-badge'),
        );
        let badge = existingBadges[0] ?? null;
        for (let i = 1; i < existingBadges.length; i += 1) {
          existingBadges[i].remove();
        }

        if (!badge) {
          badge = createBadge();
        }

        const badgeIcon = badge.querySelector<HTMLImageElement>('.natfanclub-badge-icon');
        const verifyLine = badge.querySelector<HTMLSpanElement>('.natfanclub-verify-line');
        if (!badgeIcon || !verifyLine) continue;

        if (!badge.isConnected || badge.parentElement !== heading || heading.lastChild !== badge) {
          heading.appendChild(badge);
        }


        const currentUrl = badge.getAttribute('data-url');
        const currentState = badge.getAttribute('data-verify-state');
        if (currentUrl === fullUrl && (currentState === 'pending' || currentState === 'done')) {
          continue;
        }

        badge.setAttribute('data-url', fullUrl);
        badge.setAttribute('data-verify-state', 'pending');
        resetBadgeToDefaultLayout(badge, badgeIcon, verifyLine);
        badgeIcon.src = iconUrl;
        verifyLine.textContent = 'verifying...';
        verifyLine.style.color = '#6b7280';

        void verifyUrl(fullUrl)
          .then((result) => {
            // Skip stale response if this badge has moved to another URL.
            if (badge?.getAttribute('data-url') !== fullUrl) return;

            badge.setAttribute('data-verify-state', 'done');
            const verificationImageUrl =
              verificationImageUrls[
                `${result.Verdict}:${String(result.IsSingaporeSite)}` as keyof typeof verificationImageUrls
              ];

            if (verificationImageUrl) {
              showImageBadge(badge, badgeIcon, verificationImageUrl);
              verifyLine.textContent = '';
              verifyLine.style.display = 'none';
              return;
            }

            resetBadgeToDefaultLayout(badge, badgeIcon, verifyLine);
            badgeIcon.src = iconUrl;
            verifyLine.textContent = `Verdict=${result.Verdict} | SG=${String(result.IsSingaporeSite)} | Fail=${String(result.Fail)}`;
          })
          .catch((error: unknown) => {
            if (badge?.getAttribute('data-url') !== fullUrl) return;

            badge.setAttribute('data-verify-state', 'error');
            const message = error instanceof Error ? error.message : 'unknown error';
            resetBadgeToDefaultLayout(badge, badgeIcon, verifyLine);
            badgeIcon.src = iconUrl;
            verifyLine.textContent = `verify failed: ${message}`;
            verifyLine.style.color = '#b91c1c';
          });
      }
    };

    injectDomainBadge();

    const observer = new MutationObserver(() => {
      injectDomainBadge();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  },
});
