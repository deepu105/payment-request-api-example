let request;
async function init() {
  try {
    const paymentMethodsResponse = await callServer("/api/getPaymentMethods");
    request = new PaymentRequest(buildSupportedPaymentMethodData(paymentMethodsResponse), buildShoppingCartDetails());
  } catch (error) {
    console.error(error);
    alert("Error occurred. Look at console for details");
  }
}

init();

async function checkout() {
  try {
    const paymentResponse = await request.show();
    // Here we would process the payment.
    const res = await callServer("/api/initiatePayment", {
      paymentMethod: {
        type: "scheme",
        number: paymentResponse.details.cardNumber,
        expiryMonth: paymentResponse.details.expiryMonth,
        expiryYear: paymentResponse.details.expiryYear,
        holderName: paymentResponse.details.cardholderName,
        cvc: paymentResponse.details.cardSecurityCode,
      },
    });
    switch (res.resultCode) {
      case "Authorised":
        await paymentResponse.complete("success");
        window.location.href = "/result/success";
        break;
      case "Pending":
      case "Received":
        await paymentResponse.complete("unknown");
        window.location.href = "/result/pending";
        break;
      case "Refused":
        await paymentResponse.complete("fail");
        window.location.href = "/result/failed";
        break;
      default:
        await paymentResponse.complete("fail");
        window.location.href = "/result/error";
        break;
    }
  } catch (error) {
    console.error(error);
  }
  return false;
}

function fixMasterCard(v) {
  return v === "mc" ? "mastercard" : v;
}

function getSupportedNetworksFromAdyen(paymentMethodsResponse) {
  const cardOpts = paymentMethodsResponse.paymentMethods.filter((v) => v.type === "scheme")[0];
  const supportedByPaymentAPI = ["amex", "cartebancaire", "diners", "discover", "jcb", "mc", "mir", "unionpay", "visa"];
  return supportedByPaymentAPI.reduce((acc, curr) => (cardOpts.brands.includes(curr) ? [...acc, fixMasterCard(curr)] : acc), []);
}

function buildSupportedPaymentMethodData(paymentMethodsResponse) {
  return [
    {
      supportedMethods: "basic-card",
      data: {
        supportedNetworks: getSupportedNetworksFromAdyen(paymentMethodsResponse),
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
