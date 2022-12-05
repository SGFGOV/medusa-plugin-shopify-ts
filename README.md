<!--lint disable awesome-list-item-->


# Getting started

Installation

```bash
yarn add medusa-plugin-shopify-ts
```
```
In medusa-config.js

{
    resolve:'medusa-plugin-shopify-ts'
    options:{
        api_key : #"<Your default shopify private app admin api key>}
        domain: #"<Your default shopify domain without the myshopify.com part for example :abc.myshopify.com will be abc>"
        default_store_name: #"default_store_name"

    }
}

```
# Usage

## Api



Once your plugin is done. 

```bash
npm run build && npm version && npm publish
```

You can now install it into your project file `medusa-config`.
