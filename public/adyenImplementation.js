async function checkout() {
  try {
    const adyenPaymentMethods = await callServer("/api/getPaymentMethods");
    // create a new payment request
    const request = new PaymentRequest(buildSupportedPaymentMethodData(adyenPaymentMethods), buildShoppingCartDetails());
    // show payment sheet
    const payment = await request.show();

    // This payment method handles everything and returns a final result
    if (payment.details.bobpay_token_id) {
      await payment.complete("success");
      window.location.href = "/result/success";
      return false;
    }
    // Here we would process the Adyen payment.
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
      {
        label: "Sunglasses",
        amount: { currency: "EUR", value: "5.00" },
      },
      {
        label: "Headphones",
        amount: { currency: "EUR", value: "5.00" },
      },
    ],
    total: {
      label: "Total",
      amount: { currency: "EUR", value: "10.00" },
    },
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
    // you need to install the service worker from https://bobpay.xyz/ for this to show up
    {
      supportedMethods: "https://bobpay.xyz/pay",
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
