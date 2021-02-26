---
title: Online payments using the new Web Payment APIs
description: Learn all about the new Payments APIs being standardized
published: false
featured: false
tags: [payment, javascript, web, adyen]
canonical_url:
cover_image: https://i.imgur.com/kNW3pZg.jpeg
---

The [Payment Request API](https://w3c.github.io/payment-request/) and the [Payment Handler API](https://w3c.github.io/payment-handler/) are a set of new W3C web standard being introduced to make payments easier on a website. It is aimed at standardizing and providing a consistent user experience for payments for both end-users and for merchants.

Today we will look at what exactly the APIs are, what are its advantages and how we can use them in a web application.

# What is Payment Request API

The Payment Request API provides a set of APIs to capture payment details on a website. It can collect payment credentials, like credit card details, as well as shipping and contact information from the payer through a quick and easy user interface. As of writing, the Payment Request API by default only supports card-based payment methods, like credit, debit, and prepaid cards on the web (Except on Safari which supports only Apple Pay). On mobile, cards and URL-based payment methods like Google Pay, Samsung Pay, Apple Pay, and Alipay are supported as well.

![](https://i.imgur.com/YAhQGh2.jpg)

It also provides [Interfaces](https://developer.mozilla.org/en-US/docs/Web/API/Payment_Request_API#interfaces) and [Dictionaries](https://developer.mozilla.org/en-US/docs/Web/API/Payment_Request_API#dictionaries) to show and manage the payment request.

This is currently in the W3C candidate stage and is already [supported](https://caniuse.com/payment-request) by evergreen browsers like Chrome, Opera, Safari, and Edge. Firefox supports it in its nightly builds.

Now, let's quickly look at the advantages

## Advantages of Payment Request API

The Payment Request API is meant to reduce the number of steps needed to complete an online payment. It has many advantages like

**Faster purchases**: End users can make purchases faster as they only need to input payment details (for example credit card details) once can reuse the same for subsequent purchases. They can even select from all their previous payment details. This will work across devices within the same browser and websites that use the Payment Request API.

**Consistent user experience**: As the payment form is controlled by the browser the user experience will be consistent across websites using the Payment Request API. This means the browser can control the user experience and tailor it to the user, like localizing it according to the user's preferred language configured in the browser.

**Accessibility**: As the browser controls the input elements of the payment form, it can assure consistent keyboard and screen reader accessibility on every website without developers needing to do anything. A browser could also adjust the font size or color contrast of the payment form, making it more comfortable for the user to make a payment.

**Payment method management**: Users can manage their payment details, like credit cards and shipping addresses, directly in the browser. A browser can also sync these "credentials" across devices, making it easy for users to jump from desktop to mobile and back again when buying things. This also lets users select from multiple payment methods and addresses they have saved in the browser.

![](https://i.imgur.com/eHvIFev.jpeg)

**Consistent error handling**: The browser can check the validity of card numbers, and can tell the user if a card has expired (or is about to expire). The browser can automatically suggest which card to use based on past usage patterns or restrictions from the merchant (e.g, "we only accept Visa or Mastercard"), or allow the user to say which is their default/favorite card.

## Example application

So let's put together a quick sample to see how this works. Of course, I'm going to try to make this work with Adyen as the PSP, because you still need someone to process the payments, the Payment Request API only takes care of capturing payment details.

You can find the complete source code for this example [here](https://github.com/deepu105/payment-request-api-example). I'm not going to focus on the backend as I'm using a simplified version of the NodeJS backend from [this example](https://github.com/adyen-examples/adyen-node-online-payments), you can read [this tutorial](https://docs.adyen.com/online-payments/drop-in-web/tutorial-node-js) if you are interested in the backend.

So let's assume we have built a NodeJS express web application following the above-mentioned tutorial. Now we can focus on just the client-side JavaScript part on the [`adyenImplementation.js`](https://github.com/deepu105/payment-request-api-example/blob/main/public/adyenImplementation.js) file.

First, we will call a function when the checkout button is clicked

```html
<a onclick="checkout()">
  <p class="button">Checkout</p>
</a>
```

Let's create this function where all our logic will reside. I'm using an async function so that I can use await on Promises. We first call an API to get details of supported payment methods from Adyen, this will get us details of supported credit cards. We then compare it with cards supported by Payment Request API and build supported payment methods based on the intersection. There are also a couple of helper functions to build the shopping cart summary and to call API endpoints.

```js
async function checkout() {
  try {
    const adyenPaymentMethods = await callServer("/api/getPaymentMethods");
    // create a new payment request
    const request = new PaymentRequest(buildSupportedPaymentMethodData(adyenPaymentMethods), buildShoppingCartDetails());

    // payment logic goes here
  } catch (error) {
    console.error(error);
    alert(`Error occurred: ${error.message}`);
  }
  return false;
}

function buildShoppingCartDetails() {
  // Hardcoded for demo purposes:
  return {
    id: "order-123",
    displayItems: [
      { label: "Sunglasses", amount: { currency: "EUR", value: "5.00" } },
      { label: "Headphones", amount: { currency: "EUR", value: "5.00" } },
    ],
    total: { label: "Total", amount: { currency: "EUR", value: "10.00" } },
  };
}

function buildSupportedPaymentMethodData(adyenPaymentMethods) {
  return [
    {
      supportedMethods: "basic-card",
      data: {
        supportedNetworks: getSupportedNetworksFromAdyen(adyenPaymentMethods),
        supportedTypes: ["credit"],
      },
    },
  ];
}

// compare supported cards between Adyen and Payment Request API and get the intersection
function getSupportedNetworksFromAdyen(adyenPaymentMethods) {
  const supportedByPaymentAPI = ["amex", "cartebancaire", "diners", "discover", "jcb", "mc", "mir", "unionpay", "visa"];
  // filter supported credit cards
  const supportedByAdyen = adyenPaymentMethods.paymentMethods.filter((v) => v.type === "scheme")[0].brands;
  // get only the intersection between supportedByPaymentAPI and supportedByAdyen
  return supportedByPaymentAPI.reduce((acc, curr) => (supportedByAdyen.includes(curr) ? [...acc, fixMasterCard(curr)] : acc), []);
}

// Mastercard id is not same for Adyen and Payment Request API
function fixMasterCard(v) {
  return v === "mc" ? "mastercard" : v;
}

// Calls your server endpoints
async function callServer(url, data) {
  const res = await fetch(url, {
    method: "POST",
    body: data ? JSON.stringify(data) : "",
    headers: {
      "Content-Type": "application/json",
    },
  });

  return await res.json();
}
```

Now we can invoke the payment capture sheet of the browser with `request.show()` and call the Adyen (PSP) payment API with the credit card data obtained from the payment sheet. We just process the PSP API response and handle success and failure cases.

```js
async function checkout() {
  try {
    const adyenPaymentMethods = await callServer("/api/getPaymentMethods");
    // create a new payment request
    const request = new PaymentRequest(buildSupportedPaymentMethodData(adyenPaymentMethods), buildShoppingCartDetails());
    // show payment sheet
    const payment = await request.show();
    // Here we would process the payment.
    const response = await callServer("/api/initiatePayment", {
      // This works only for PCI compliant credit card payments.
      // For non PCI compliant payments the data needs to be encrypted with something like https://github.com/Adyen/adyen-cse-web
      // But encrypting data here is not secure as a malicious script may be able to access the data in memory here
      paymentMethod: {
        type: "scheme",
        number: payment.details.cardNumber,
        expiryMonth: payment.details.expiryMonth,
        expiryYear: payment.details.expiryYear,
        holderName: payment.details.cardholderName,
        cvc: payment.details.cardSecurityCode,
      },
    });
    // Handle the response code
    switch (response.resultCode) {
      case "Authorised":
        await payment.complete("success");
        window.location.href = "/result/success";
        break;
      case "Pending":
      case "Received":
        await payment.complete("unknown");
        window.location.href = "/result/pending";
        break;
      case "Refused":
        await payment.complete("fail");
        window.location.href = "/result/failed";
        break;
      default:
        await payment.complete("fail");
        window.location.href = "/result/error";
        break;
    }
  } catch (error) {
    // ...
  }
  return false;
}
```

When running the code we should see a payment sheet like below

![](https://i.imgur.com/gAZBEaR.jpeg)

**Note**: This is absolutely not recommended for production use with Adyen as the Payment Request API is quite new and capturing credit card data via this is still not as secure as using the [Web components](https://github.com/Adyen/adyen-web) provided by Adyen which securely encrypts the data. I'm not encrypting card details, which is only possible if you are PCI compliant and your Adyen account has the necessary roles. In the future, once the Payment Handler API becomes widely implemented by browsers, this could change and Adyen might start providing official support for this. We will see more about that later in the post.

You can try this example by following the below steps. The actual payment will fail if your Adyen account is not PCI compliant, that's ok you will still be able to see how the Payment Request API works.

```bash
# Clone this repo
$ git clone https://github.com/deepu105/payment-request-api-example
$ cd payment-request-api-example
# Install dependencies
$ npm install
# create a file named `.env` with values `API_KEY="your_Adyen_API_key"` and `MERCHANT_ACCOUNT="your_Adyen_merchant_account"`
$ vi .env
# start application
$ npm start
```

That is it, there are more advanced use cases that can be handled using the API and you can find some of them [here](https://developer.mozilla.org/en-US/docs/Web/API/Payment_Request_API/Using_the_Payment_Request_API).

# What is Payment Handler API

The [Payment Handler API](https://www.w3.org/TR/payment-handler/) builds upon Payment Request API and lets a web application add new payment providers using service workers so that more payment methods are available through the Payment Request API. [Here](https://rsolomakhin.github.io/pr/apps/) are a list of demos showing different possibilities.

This is currently in the W3C draft stage and is so far only has support in Chrome.

## Advantages of Payment Request API

This is more interesting for payment service providers, like Adyen, as we will be able to provide our own payment methods via the standard Payment Request API. We could even provide our own secure fields this way for example. This could lead the way for different payment methods to provide a consistent experience across sites and adds to the advantages we saw in the previous section

## Example application

We can easily build on the above sample. Let's use the demo Payment Handler called BobPay. First, head over to its [website](https://bobpay.xyz/) and install the service worker by clicking on **"Install BobPay Web Payment App"**. Now on our return array in method `buildSupportedPaymentMethodData` add the following

```js
{
  supportedMethods: "https://bobpay.xyz/pay",
}
```

Now after `request.show()` in method `checkout` add the below handling for the new payment method

```js
const payment = await request.show();

// This payment method handles everything and returns a final result
if (payment.details.bobpay_token_id) {
  await payment.complete("success");
  window.location.href = "/result/success";
  return false;
}
```

![](https://i.imgur.com/cC3XPec.jpeg)

And that's it we now have a new payment method available on the Payment Request API

# Conclusion

While the Web Payment APIs and not mature enough to replace the client-side components provided by PSPs, I do see a bright future once the APIs are implemented by all major browsers, especially the Payment Handler APIs. When this happens it would be beneficial for merchants, end-users, and PSPs alike as there will be more consistency in user experience for end-users and standardized implementation for merchants and PSPs. At Adyen, we will be closely watching developments in this space to see how we can provide a better user experience using this in the future.

---

## References

- [web.dev](https://web.dev/web-payments-updates/)
- [developers.google.com](https://developers.google.com/web/updates/2018/06/payment-handler-api)
- [medium.com/dev-channel](https://medium.com/dev-channel/how-payment-methods-work-in-the-payment-request-api-54b8f2ee03c5)
- [medium.com/dev-channel](https://medium.com/dev-channel/integrating-the-payment-request-api-with-a-payment-service-provider-b6a23aa44bd6)

---

If you like this article, please leave a like or a comment.

You can follow me on [Twitter](https://twitter.com/deepu105) and [LinkedIn](https://www.linkedin.com/in/deepu05/).

Cover image credit: Photo by [rupixen.com](https://unsplash.com/@rupixen?utm_source=unsplash&utm_medium=referral&utm_content=creditCopyText) on [Unsplash](https://unsplash.com/s/photos/online-payment?utm_source=unsplash&utm_medium=referral&utm_content=creditCopyText)
