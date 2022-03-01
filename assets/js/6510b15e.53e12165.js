"use strict";(self.webpackChunkidentity_docs=self.webpackChunkidentity_docs||[]).push([[8511],{3905:function(e,t,n){n.d(t,{Zo:function(){return p},kt:function(){return m}});var a=n(7294);function r(e,t,n){return t in e?Object.defineProperty(e,t,{value:n,enumerable:!0,configurable:!0,writable:!0}):e[t]=n,e}function o(e,t){var n=Object.keys(e);if(Object.getOwnPropertySymbols){var a=Object.getOwnPropertySymbols(e);t&&(a=a.filter((function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable}))),n.push.apply(n,a)}return n}function l(e){for(var t=1;t<arguments.length;t++){var n=null!=arguments[t]?arguments[t]:{};t%2?o(Object(n),!0).forEach((function(t){r(e,t,n[t])})):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(n)):o(Object(n)).forEach((function(t){Object.defineProperty(e,t,Object.getOwnPropertyDescriptor(n,t))}))}return e}function i(e,t){if(null==e)return{};var n,a,r=function(e,t){if(null==e)return{};var n,a,r={},o=Object.keys(e);for(a=0;a<o.length;a++)n=o[a],t.indexOf(n)>=0||(r[n]=e[n]);return r}(e,t);if(Object.getOwnPropertySymbols){var o=Object.getOwnPropertySymbols(e);for(a=0;a<o.length;a++)n=o[a],t.indexOf(n)>=0||Object.prototype.propertyIsEnumerable.call(e,n)&&(r[n]=e[n])}return r}var c=a.createContext({}),d=function(e){var t=a.useContext(c),n=t;return e&&(n="function"==typeof e?e(t):l(l({},t),e)),n},p=function(e){var t=d(e.components);return a.createElement(c.Provider,{value:t},e.children)},u={inlineCode:"code",wrapper:function(e){var t=e.children;return a.createElement(a.Fragment,{},t)}},s=a.forwardRef((function(e,t){var n=e.components,r=e.mdxType,o=e.originalType,c=e.parentName,p=i(e,["components","mdxType","originalType","parentName"]),s=d(n),m=r,f=s["".concat(c,".").concat(m)]||s[m]||u[m]||o;return n?a.createElement(f,l(l({ref:t},p),{},{components:n})):a.createElement(f,l({ref:t},p))}));function m(e,t){var n=arguments,r=t&&t.mdxType;if("string"==typeof e||r){var o=n.length,l=new Array(o);l[0]=s;var i={};for(var c in t)hasOwnProperty.call(t,c)&&(i[c]=t[c]);i.originalType=e,i.mdxType="string"==typeof e?e:r,l[1]=i;for(var d=2;d<o;d++)l[d]=n[d];return a.createElement.apply(null,l)}return a.createElement.apply(null,n)}s.displayName="MDXCreateElement"},2731:function(e,t,n){n.r(t),n.d(t,{frontMatter:function(){return i},contentTitle:function(){return c},metadata:function(){return d},assets:function(){return p},toc:function(){return u},default:function(){return m}});var a=n(7462),r=n(3366),o=(n(7294),n(3905)),l=["components"],i={},c="Gateway Demo Application",d={unversionedId:"gateway-demo/gateway-demo",id:"gateway-demo/gateway-demo",title:"Gateway Demo Application",description:"The Gateway demo application show a basic examples of:",source:"@site/docs/gateway-demo/gateway-demo.md",sourceDirName:"gateway-demo",slug:"/gateway-demo/",permalink:"/docs/gateway-demo/",editUrl:"https://github.com/facebook/docusaurus/tree/main/packages/create-docusaurus/templates/shared/docs/gateway-demo/gateway-demo.md",tags:[],version:"current",frontMatter:{},sidebar:"tutorialSidebar",previous:{title:"Overview",permalink:"/docs/overview"},next:{title:"Introduction",permalink:"/docs/gateway-protocol/existing-gatekeeper-networks/intro"}},p={},u=[{value:"Live Demo",id:"live-demo",level:2},{value:"Run the demo locally",id:"run-the-demo-locally",level:2},{value:"Configure the Demo",id:"configure-the-demo",level:2},{value:"Frontend Configuration",id:"frontend-configuration",level:3},{value:"Backend Configuration",id:"backend-configuration",level:3},{value:"Development",id:"development",level:2},{value:"Frontend",id:"frontend",level:3},{value:"Backend",id:"backend",level:3},{value:"Program",id:"program",level:3}],s={toc:u};function m(e){var t=e.components,n=(0,r.Z)(e,l);return(0,o.kt)("wrapper",(0,a.Z)({},s,n,{components:t,mdxType:"MDXLayout"}),(0,o.kt)("h1",{id:"gateway-demo-application"},"Gateway Demo Application"),(0,o.kt)("p",null,"The Gateway demo application show a basic examples of:"),(0,o.kt)("ul",null,(0,o.kt)("li",{parentName:"ul"},"Checking for the existence of a Gateway token on the frontend"),(0,o.kt)("li",{parentName:"ul"},"Issuing a token from the server side (gatekeeper signs & pays)"),(0,o.kt)("li",{parentName:"ul"},"Issuing a token from the client side (signed and paid by the user's wallet)"),(0,o.kt)("li",{parentName:"ul"},"Executing a transfer of SOL through a program that checks for the existence of the gateway token")),(0,o.kt)("h2",{id:"live-demo"},"Live Demo"),(0,o.kt)("p",null,"A live demo can be accessed at ",(0,o.kt)("a",{parentName:"p",href:"https://demo.identity.com/protected-transfer/index.html"},"https://demo.identity.com/protected-transfer/index.html"),"."),(0,o.kt)("h2",{id:"run-the-demo-locally"},"Run the demo locally"),(0,o.kt)("p",null,"The source code for the project is hosted on Github ",(0,o.kt)("a",{parentName:"p",href:"https://github.com/identity-com/gateway-demo"},"here"),".\nThe following command will bundle the frontend and launch an express server serving both the static frontend\ncontent and the backend web service."),(0,o.kt)("pre",null,(0,o.kt)("code",{parentName:"pre",className:"language-bash"},"yarn demo\n")),(0,o.kt)("h2",{id:"configure-the-demo"},"Configure the Demo"),(0,o.kt)("p",null,"To configure the application to use a different gatekeeper, network or other settings."),(0,o.kt)("h3",{id:"frontend-configuration"},"Frontend Configuration"),(0,o.kt)("p",null,"The default frontend configuration can be found at ",(0,o.kt)("inlineCode",{parentName:"p"},"frontend/src/config/default.js"),", and can be overridden based on\nthe ",(0,o.kt)("inlineCode",{parentName:"p"},"STAGE")," environment variable at ",(0,o.kt)("inlineCode",{parentName:"p"},"frontend/src/config/{STAGE}.js")),(0,o.kt)("pre",null,(0,o.kt)("code",{parentName:"pre",className:"language-javascript"},"module.exports = {\n  // The base58 encoded public key for the gatekeeper network\n  gatekeeperNetworkPublicKey58: 'tgnuXXNMDLK8dy7Xm1TdeGyc95MDym4bvAQCwcW21Bf',\n  // The solana cluster to use\n  solanaCluster: 'devnet',\n  // The endpoint base url for the backend\n  apiEndpointBaseUrl: 'https://gatekeeper-demo.identity.com',\n}\n")),(0,o.kt)("h3",{id:"backend-configuration"},"Backend Configuration"),(0,o.kt)("p",null,"The default backend configuration can be found at ",(0,o.kt)("inlineCode",{parentName:"p"},"backend/src/config/default.js"),", and can be overridden based on\nthe ",(0,o.kt)("inlineCode",{parentName:"p"},"STAGE")," environment variable at ",(0,o.kt)("inlineCode",{parentName:"p"},"backend/src/config/{STAGE}.js")),(0,o.kt)("pre",null,(0,o.kt)("code",{parentName:"pre",className:"language-javascript"},"module.exports = {\n  // The base58 encoded private key for the gatekeeper\n  gatekeeperAuthoritySecretKey58: 'QzSdRKirjb3Dq64ZoWkxyNwmNVgefWNrAcUGwJF6pVx9ZeiXYCWWc4eBFBYwgP5qBnwmX3nA6PYQqLuqSuuuFsx',\n  // The base58 encoded public key for the gatekeeper network\n  gatekeeperNetworkPublicKey58: 'tgnuXXNMDLK8dy7Xm1TdeGyc95MDym4bvAQCwcW21Bf',\n  // The solana cluster to use \n  solanaCluster: 'devnet',\n  // The port to run the web server on\n  serverPort: 3000,\n  // Serve static content from the frontend from express (for local testing)\n  serveStatic: false\n}\n")),(0,o.kt)("h2",{id:"development"},"Development"),(0,o.kt)("h3",{id:"frontend"},"Frontend"),(0,o.kt)("pre",null,(0,o.kt)("code",{parentName:"pre",className:"language-bash"},"yarn workspace @identity.com/gateway-demo-frontend watch\n")),(0,o.kt)("p",null,"This will launch the frontend webpack build, and automatically re-run on changes to the frontend project."),(0,o.kt)("h3",{id:"backend"},"Backend"),(0,o.kt)("pre",null,(0,o.kt)("code",{parentName:"pre",className:"language-bash"},"yarn workspace @identity.com/gateway-demo-backend watch\n")),(0,o.kt)("p",null,"This will launch the backend express app, and automatically re-run on save. By default it will serve the content from\nthe frontend project at ",(0,o.kt)("inlineCode",{parentName:"p"},"frontend/dist")," ;"),(0,o.kt)("h3",{id:"program"},"Program"),(0,o.kt)("p",null,"The sample Solana program provided is developed using ",(0,o.kt)("a",{parentName:"p",href:"https://github.com/project-serum/anchor"},"Anchor"),". You will need\nthe following:"),(0,o.kt)("ol",null,(0,o.kt)("li",{parentName:"ol"},(0,o.kt)("a",{parentName:"li",href:"https://docs.solana.com/cli/install-solana-cli-tools"},"Solana Tool Suite"),"."),(0,o.kt)("li",{parentName:"ol"},(0,o.kt)("a",{parentName:"li",href:"https://www.rust-lang.org/tools/install"},"Rust")),(0,o.kt)("li",{parentName:"ol"},(0,o.kt)("a",{parentName:"li",href:"https://project-serum.github.io/anchor/getting-started/installation.html"},"Anchor"))),(0,o.kt)("p",null,"Build the program:"),(0,o.kt)("pre",null,(0,o.kt)("code",{parentName:"pre",className:"language-bash"},"cd program\nanchor build\n")),(0,o.kt)("p",null,"If you wish to deploy the program on devnet, make sure to update the program ID. After a build, get the generated\naddress by executing:"),(0,o.kt)("pre",null,(0,o.kt)("code",{parentName:"pre",className:"language-bash"},"solana -k program/target/deploy/gateway_demo-keypair.json address\n")),(0,o.kt)("p",null,"or replace it with your own Solana key."),(0,o.kt)("p",null,"Update the program ID in ",(0,o.kt)("inlineCode",{parentName:"p"},"programs/gateway_demo/src/lib.rs")," by replacing:"),(0,o.kt)("pre",null,(0,o.kt)("code",{parentName:"pre",className:"language-rust"},'declare_id!("<your program id>");\n')),(0,o.kt)("p",null,"Deploy the program:"),(0,o.kt)("pre",null,(0,o.kt)("code",{parentName:"pre",className:"language-bash"},"anchor deploy --provider.cluster devnet\n")))}m.isMDXComponent=!0}}]);