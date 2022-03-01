import React from 'react';
import clsx from 'clsx';
import styles from './styles.module.css';

const FeatureList = [
  {
    title: 'Gateway Protocol',
    img: '/img/ICON-gear@2x.png',
    description: (
      <>
          The Identity.com Gateway Protocol is a cross-chain oracle token model that enables any application
          operating on a decentralized ledger, such as a dApp, to add a permissioning layer that adheres to a
          prespecified framework of rules.
      </>
    ),
  },
  {
    title: 'Cryptid',
    img: '/img/CryptidSquid-Large.png',
    description: (
      <>
        Cryptid manages your Solana wallet through an on-chain, non-custodial proxy account.
      </>
    ),
  },
  {
    title: 'DIDs and VCs',
    img: '/img/ICON-mobile-id@2x.png',
    description: (
      <>
        A globally unique identifier that does not require a centralized registration authority because it is
        registered with distributed ledger technology or other decentralized networks
      </>
    ),
  },
];

function Feature({img, title, description}) {
  return (
    <div className={clsx('col col--4')}>
      <div className="text--center">
        <img src={img} alt={title} className="feature-img"/>
      </div>
      <div className="text--center padding-horiz--md">
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
    </div>
  );
}

export default function HomepageFeatures() {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}
