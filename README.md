## rs-onetimesecret

The rs-onetimesecret project is an experimental implementation of running pure Rust code on Cloudflare Workers. This project allows you to securely store and share sensitive information using a one-time secret mechanism.

### Introduction

rs-onetimesecret is a proof-of-concept project that showcases how you can leverage Rust programming language in a serverless environment like Cloudflare Workers. The project provides a simple and secure way to share one-time secrets with others.

### Features

* End-to-end Encryption: The secret is never sent to server. Local encryption and decryption using WebCrypto API
* Time-limited access: Secrets are automatically deleted after they are accessed or after a specified time period.


### Develop Frontend

1. `cd www`
2. `yarn parcel src/index.html`

### Release

1. Run `yarn build` under the `www` folder
2. Run `yarn deploy` under the root folder

