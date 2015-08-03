var Header = React.createClass({
    render: function () {
        return (
            <div class="jumbotron">
            <h1>Dispensor</h1>
            <p>{this.props.text}</p>
            </div>
        );
    }
});

var AuthButton = React.createClass({
  render: function() {
    return (
      <div>
        <input type="password" className="form-control" name="pwd" placeholder="Super Special Dispensor Key"></input>
        <button className="btn btn-lg btn-primary btn-block" type="submit">Update Venmo</button>
      </div>
    );
  }
});

var VenmoAuth = React.createClass({
    render: function () {
        return (
        <form className="form-signin" action='/auth/venmo' method="POST">
          <h3 className="form">Dispensor Charge Account</h3>
          <div className="row">
            <div className="col-md-6 col-tag">User</div>
            <div className="col-md-6">{this.props.data.username}</div>
          </div>
          <div className="row">
            <div className="col-md-6 col-tag">Full Name</div>
            <div className="col-md-6">{this.props.data.displayname}</div>
          </div>
          <div className="row">
            <div className="col-md-6 col-tag">Email</div>
            <div className="col-md-6">{this.props.data.email}</div>
          </div>
          <AuthButton/>
        </form>
        );
    }
});

var App = React.createClass({
    getInitialState: function() {
        return {data: {
            username : "N/A",
            displayname : "N/A",
            email : "N/A",
          }
        };
    },
    loadCurrentVenmoUser: function() {
      $.ajax({
      url: this.props.url,
      dataType: 'json',
      cache: false,
      success: function(data) {
        this.setState({data: data});
      }.bind(this),
      error: function(xhr, status, err) {
        console.error(this.props.url, status, err.toString());
      }.bind(this)
          });
    },
    componentDidMount: function() {
       this.loadCurrentVenmoUser();
    },
    render: function() {
        return (
            <div>
                <Header text="Hello, I am Dispensor, your friendly neighborhood snackbot."/>
                <div className="container">
                <VenmoAuth data={this.state.data}/>
                </div>
            </div>
        );
    }
});

React.render(<App url="/users/venmo"/>, document.getElementById('main'));
