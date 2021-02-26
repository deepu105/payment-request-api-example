async function checkout() {
  try {
    const adyenPaymentMethods = await callServer("/api/getPaymentMethods");
    // create a new payment request
    const request = new PaymentRequest(buildSupportedPaymentMethodData(adyenPaymentMethods), buildShoppingCartDetails());
    // show payment dialog
    const payment = await request.show();
    // Here we would process the payment.
    const response = await callServer("/api/initiatePayment", {
      // This works only for PCI compliant credit card payments.
      // For non PCI compliant payments the data needs to be encrypted with something like https://github.com/Adyen/adyen-cse-web
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

// Mastercard id is not same for adyen and Payment Request API
function fixMasterCard(v) {
  return v === "mc" ? "mastercard" : v;
}

// compare supported cards between Adyen and Payment Request API and get the intersection
function getSupportedNetworksFromAdyen(adyenPaymentMethods) {
  const supportedByPaymentAPI = ["amex", "cartebancaire", "diners", "discover", "jcb", "mc", "mir", "unionpay", "visa"];
  const cardOpts = adyenPaymentMethods.paymentMethods.filter((v) => v.type === "scheme")[0];
  return supportedByPaymentAPI.reduce((acc, curr) => (cardOpts.brands.includes(curr) ? [...acc, fixMasterCard(curr)] : acc), []);
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
