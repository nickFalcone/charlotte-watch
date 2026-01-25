import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';

import closeIcon from '../../assets/icons/close.svg';
import {
  FooterBar,
  FooterLinkButton,
  FooterReportLink,
  FooterDialogOverlay,
  FooterDialogContent,
  FooterDialogHeader,
  FooterDialogTitle,
  FooterDialogClose,
  FooterDialogCloseIcon,
  FooterDialogBody,
} from './Footer.styles';

const ISSUES_URL = 'https://github.com/nickFalcone/charlotte-watch/issues/new';
const CLOUDFLARE_PRIVACY_URL = 'https://www.cloudflare.com/privacypolicy/';

export function Footer() {
  const [isLegalOpen, setIsLegalOpen] = useState(false);
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);
  const year = new Date().getFullYear();

  return (
    <FooterBar as="footer" role="contentinfo">
      <span>&copy; {year} Charlotte Watch</span>
      <span>|</span>
      <Dialog.Root open={isLegalOpen} onOpenChange={setIsLegalOpen}>
        <FooterLinkButton type="button" onClick={() => setIsLegalOpen(true)}>
          Legal
        </FooterLinkButton>
        <Dialog.Portal>
          <Dialog.Overlay asChild>
            <FooterDialogOverlay>
              <Dialog.Content asChild>
                <FooterDialogContent>
                  <FooterDialogHeader>
                    <Dialog.Title asChild>
                      <FooterDialogTitle>DISCLAIMER</FooterDialogTitle>
                    </Dialog.Title>
                    <Dialog.Close asChild>
                      <FooterDialogClose aria-label="Close">
                        <FooterDialogCloseIcon src={closeIcon} alt="" aria-hidden />
                      </FooterDialogClose>
                    </Dialog.Close>
                  </FooterDialogHeader>
                  <FooterDialogBody>
                    <p>
                      This website and all associated software, content, and services are provided
                      on an "as is" and "as available" basis, without warranties of any kind, either
                      express or implied, including but not limited to implied warranties of
                      merchantability, fitness for a particular purpose, or non-infringement. The
                      operator of this site makes no warranty that the service will be
                      uninterrupted, timely, secure, or error-free.
                    </p>
                    <p>
                      The information displayed on this site is aggregated from third-party sources
                      and is provided for general informational purposes only. The operator does not
                      guarantee the accuracy, completeness, timeliness, or reliability of any data
                      or information presented. Users should independently verify any information
                      before relying upon it.
                    </p>
                    <p>
                      This site is not a substitute for official emergency alerts, notifications, or
                      services. In the event of an emergency, users should contact 911 or consult
                      official government and public safety sources directly.
                    </p>
                    <p>
                      In no event shall the operator be liable for any direct, indirect, incidental,
                      special, consequential, or punitive damages arising out of or related to your
                      access to or use of, or inability to access or use, this site or any
                      information contained herein.
                    </p>
                    <p>
                      This site is an independent project and is not sponsored by, endorsed by, or
                      affiliated with any government agency, municipality, transportation authority,
                      utility provider, or any other third-party data source. All trademarks,
                      service marks, and product names referenced herein are the property of their
                      respective owners and are used solely for identification purposes.
                    </p>
                    <p>
                      By using this site, you acknowledge that you have read and understood this
                      disclaimer and agree to be bound by its terms.
                    </p>
                  </FooterDialogBody>
                </FooterDialogContent>
              </Dialog.Content>
            </FooterDialogOverlay>
          </Dialog.Overlay>
        </Dialog.Portal>
      </Dialog.Root>
      <span>|</span>
      <Dialog.Root open={isPrivacyOpen} onOpenChange={setIsPrivacyOpen}>
        <FooterLinkButton type="button" onClick={() => setIsPrivacyOpen(true)}>
          Privacy
        </FooterLinkButton>
        <Dialog.Portal>
          <Dialog.Overlay asChild>
            <FooterDialogOverlay>
              <Dialog.Content asChild>
                <FooterDialogContent>
                  <FooterDialogHeader>
                    <Dialog.Title asChild>
                      <FooterDialogTitle>PRIVACY &amp; DATA COLLECTION</FooterDialogTitle>
                    </Dialog.Title>
                    <Dialog.Close asChild>
                      <FooterDialogClose aria-label="Close">
                        <FooterDialogCloseIcon src={closeIcon} alt="" aria-hidden />
                      </FooterDialogClose>
                    </Dialog.Close>
                  </FooterDialogHeader>
                  <FooterDialogBody>
                    <p>
                      This site uses Cloudflare Web Analytics to collect anonymous usage statistics.
                      Cloudflare Web Analytics does not use cookies, does not track individual
                      users, and does not collect personally identifiable information. For more
                      information, please refer to{' '}
                      <a href={CLOUDFLARE_PRIVACY_URL} target="_blank" rel="noopener noreferrer">
                        Cloudflare&apos;s privacy policy
                      </a>
                      .
                    </p>
                  </FooterDialogBody>
                </FooterDialogContent>
              </Dialog.Content>
            </FooterDialogOverlay>
          </Dialog.Overlay>
        </Dialog.Portal>
      </Dialog.Root>
      <span>|</span>
      <FooterReportLink href={ISSUES_URL} target="_blank" rel="noopener noreferrer">
        Report an issue
      </FooterReportLink>
    </FooterBar>
  );
}
