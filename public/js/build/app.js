"use strict";

var Header = React.createClass({
  displayName: "Header",

  render: function render() {
    return React.createElement(
      "div",
      { "class": "jumbotron" },
      React.createElement(
        "h1",
        null,
        "Dispensor"
      ),
      React.createElement(
        "p",
        null,
        this.props.text
      )
    );
  }
});

var AuthButton = React.createClass({
  displayName: "AuthButton",

  render: function render() {
    return React.createElement(
      "div",
      null,
      React.createElement("input", { type: "password", className: "form-control", name: "pwd", placeholder: "Super Special Dispensor Key" }),
      React.createElement(
        "button",
        { className: "btn btn-lg btn-primary btn-block", type: "submit" },
        "Update Venmo"
      )
    );
  }
});

var VenmoAuth = React.createClass({
  displayName: "VenmoAuth",

  render: function render() {
    return React.createElement(
      "form",
      { className: "form-signin", action: "/auth/venmo", method: "POST" },
      React.createElement(
        "h3",
        { className: "form" },
        "Dispensor Charge Account"
      ),
      React.createElement(
        "div",
        { className: "row" },
        React.createElement(
          "div",
          { className: "col-md-6 col-tag" },
          "User"
        ),
        React.createElement(
          "div",
          { className: "col-md-6" },
          this.props.data.username
        )
      ),
      React.createElement(
        "div",
        { className: "row" },
        React.createElement(
          "div",
          { className: "col-md-6 col-tag" },
          "Full Name"
        ),
        React.createElement(
          "div",
          { className: "col-md-6" },
          this.props.data.displayname
        )
      ),
      React.createElement(
        "div",
        { className: "row" },
        React.createElement(
          "div",
          { className: "col-md-6 col-tag" },
          "Email"
        ),
        React.createElement(
          "div",
          { className: "col-md-6" },
          this.props.data.email
        )
      ),
      React.createElement(AuthButton, null)
    );
  }
});

var App = React.createClass({
  displayName: "App",

  getInitialState: function getInitialState() {
    return { data: {
        username: "N/A",
        displayname: "N/A",
        email: "N/A"
      }
    };
  },
  loadCurrentVenmoUser: function loadCurrentVenmoUser() {
    $.ajax({
      url: this.props.url,
      dataType: 'json',
      cache: false,
      success: (function (data) {
        this.setState({ data: data });
      }).bind(this),
      error: (function (xhr, status, err) {
        console.error(this.props.url, status, err.toString());
      }).bind(this)
    });
  },
  componentDidMount: function componentDidMount() {
    this.loadCurrentVenmoUser();
  },
  render: function render() {
    return React.createElement(
      "div",
      null,
      React.createElement(Header, { text: "Hello, I am Dispensor, your friendly neighborhood snackbot." }),
      React.createElement(
        "div",
        { className: "container" },
        React.createElement(VenmoAuth, { data: this.state.data })
      )
    );
  }
});

React.render(React.createElement(App, { url: "/users/venmo" }), document.getElementById('main'));
