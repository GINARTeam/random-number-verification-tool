import React, { Component } from 'react';
import './VerifyForm.css';

class VerifyForm extends Component {
  constructor(props) {
    super(props);
    this.state = {
      data: null,
      verifyStatus: 0,
      showDetails: false,
      showBlockInfo: false,
      blockInfoData: null,
      status: []
    };

    this.isQueryingTicketId = this.isQueryingTicketId.bind(this);
    this.handleChangeticketId = this.handleChangeticketId.bind(this);
    this.handleSearchTicket = this.handleSearchTicket.bind(this);
    this.handleEnterSearch = this.keyUpHandler.bind(this, "EnterSearch");
    this.handleSubmitticketId = this.handleSubmitticketId.bind(this);
    this.handleShowDetails = this.handleShowDetails.bind(this);
    this.handleShowBlockInfo = this.handleShowBlockInfo.bind(this);
    this.handleHideBlockInfo = this.handleHideBlockInfo.bind(this);
    this.handleCopyJSON = this.handleCopyJSON.bind(this);

    if (this.isQueryingTicketId()) {
      this.handleSubmitticketId(window.location.search.substring(10));
    }
  }

  componentDidMount() {
    window.addEventListener("popstate", this.reloadForm);
  }

  reloadForm() {
    window.location.reload();
  }

  keyUpHandler(refName, event) {
    if (refName === "EnterSearch" && event.keyCode === 13) {
      document.getElementById("search-button").click();
    }
  }

  isQueryingTicketId() {
    return window.location.search.match("\\?ticketId=([0-9]|[a-f]){64}");
  }

  handleChangeticketId() {
    this.setState({
      data: null,
      verifyStatus: 0,
      showDetails: false,
      showBlockInfo: false,
      blockInfoData: null,
      status: []
    });
  }

  handleSearchTicket() {
    this.handleSubmitticketId(document.getElementById("inputTicketId").value);
  }

  handleSubmitticketId(ticketId) {
    if (ticketId.length !== 64) {
      this.setState({
        data: null,
        verifyStatus: 3,
        showDetails: false,
        showBlockInfo: false,
        blockInfoData: null,
        status: []
      });
    } else {
      fetch('https://test.ginar.io/rng/pod/' + ticketId).then(response => {
        return response.text();
      }).then(responseData => {
        if (responseData.substr(0, 1) !== "{") {
          this.setState({
            data: null,
            verifyStatus: 2,
            showDetails: false,
            showBlockInfo: false,
            blockInfoData: null,
            status: []
          });

          return;
        }

        var newData = JSON.parse(responseData);
        if (!newData.proofs) {
          this.setState({
            data: null,
            verifyStatus: 2,
            showDetails: false,
            showBlockInfo: false,
            blockInfoData: null,
            status: []
          });
        } else {
          var newUrl = "?ticketId=" + ticketId;
          if (window.location.search !== newUrl) {
            window.history.pushState(ticketId, ticketId, newUrl);
          }
          var newStatus = new Array(newData.proofs.length).fill(0);
          var success = this.verifyOutput(newData, newStatus);
          this.setState({
            data: newData,
            verifyStatus: success ? 1 : 2,
            status: newStatus
          });
          this.handleShowBlockInfo();
        }
      }).catch(err => {
        alert('Error getting ticket: ' + err);
        this.setState({
          data: null,
          verifyStatus: 0,
          showDetails: false,
          showBlockInfo: false,
          blockInfoData: null,
          status: []
        });
      });
    }
  }

  handleShowDetails() {
    this.setState({
      showDetails: true
    });
  }

  handleShowBlockInfo() {
    if (!this.state.showBlockInfo) {
      this.setState({
        showBlockInfo: true
      });
    }

    if (!this.state.blockInfoData) {
      fetch('https://dev-block.ginar.io/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({'jsonrpc':'2.0','method':'eth_getTransactionByHash','params':['0x' + this.state.data.txhash],'id':1})
      }).then(response => {
        return response.text();
      }).then(responseData => {
        var newData = JSON.parse(responseData);
        this.setState({
          blockInfoData: newData.result
        });
      }).catch(err => {
        alert('Error getting block information: 0x' + this.state.data.txhash);
        this.setState({
          blockInfoData: null
        });
      });
    }
  }

  handleHideBlockInfo() {
    if (this.state.showBlockInfo) {
      this.setState({
        showBlockInfo: false
      });
    }
  }

  handleCopyJSON() {
    var copyText = document.getElementById("json-data");
    copyText.select();
    document.execCommand("copy");
  }

  formatPrice(price, precision) {
    var priceString = price.toFixed(precision).toString();
    while (priceString.slice(-1) === "0") {
      priceString = priceString.substring(0, priceString.length-1);
    }

    if (priceString.slice(-1) === ".") {
      priceString = priceString.substring(0, priceString.length-1);
    }

    return priceString;
  }

  verifyContributionsRanNum(pod, cback) {
    const secp256k1 = require('secp256k1');
    var signature = new Buffer(pod.signature, 'hex');
    if(signature.length >= 65) {
      var sign = signature.slice(0, 64);
    }
    
    var publicKey = new Buffer(pod.publickey, 'hex');
    var resBuider = Buffer.alloc(90);

    resBuider.write(pod.timestamp, 0 , 25, 'utf8');
    resBuider.write(pod.publickey, 25, 33, 'hex');
    resBuider.write(pod.ticket, 58, 32, 'hex');
    const keccak256 = require('js-sha3').keccak256;
 
    var msgHash = keccak256(resBuider);
    var contribution = keccak256(signature);
    var isValid = secp256k1.verify(new Buffer(msgHash, 'hex'), sign, publicKey) && pod.contribution === contribution;

    cback(isValid);
  }
  
  verifyOutput(data, status) {
    var bigInt = require("big-integer");
    var inter = bigInt();
    var finalResult = true;
    
    data.proofs.forEach((proof, i) => {
      this.verifyContributionsRanNum(proof, function(isValid){
        finalResult = finalResult & isValid;
      });
      var collectedNum = bigInt(proof.contribution, 16);
      inter = inter.xor(collectedNum);
      status[i] = this.verifyPOD(i, proof);
    });
    
    if(finalResult) {
      var result = bigInt(data.output, 16)
      if(inter.compare(result) === 0){
        return true;
      } else {
        return false;
      }
    } else {
      return false;
    }
  }

  verifyPOD(i, pod) {
    const secp256k1 = require('secp256k1');
    var signature = new Buffer(pod.credential, 'hex');
    if (signature.length >= 65){
      var sign = signature.slice(0, 64);
    }
  
    var ticket = new Buffer(pod.ticket, 'hex');
    var publicKey = new Buffer(pod.publickey, 'hex');
    var isValid = secp256k1.verify(ticket, sign, publicKey)
    
    return isValid;
  }

  render() {
    return (
      <div class="verify-form">
        <div class="banner" style={{ backgroundImage: `url("img/bg-top.svg")` }}>
        </div>
        <div class="outer">
          <div class="ticket-outer">
            <div class="ticket-label">
              <label class="ticket-label">Ticket ID</label>
            </div>
            <div class="ticket-input-search">
              <input id="inputTicketId" type="text" class="ticket-input"
                onKeyUp={this.handleEnterSearch}
                placeholder={this.isQueryingTicketId() ? window.location.search.substring(10) : "Enter your ticket ID"}
                onChange={this.handleChangeticketId}/>
              <button id="search-button" class="search-button" onClick={this.handleSearchTicket}>Search</button>
            </div>
          </div>
          <div class={this.state.verifyStatus === 1 ? "notification" : "d-none"}>
          Your ticket has been&nbsp;<b>successfully verified</b>, the result is&nbsp;<b>valid</b>.&nbsp;{this.state.showDetails ? String.empty : <span onClick={this.handleShowDetails}><b class="view-result"><u>View Results</u></b></span>}
          </div>
          <div class={this.state.verifyStatus === 2 ? "notification invalid-notification" : "d-none"}>
          Your ticket has been verified, the result is&nbsp;<b>invalid.</b>
          </div>
          <div class={this.state.verifyStatus === 3 ? "notification invalid-notification" : "d-none"}>
          Invalid Input!
          </div>
          <div class={this.state.showDetails ? "information-json-table" : "d-none"}>
            <div class="information-json">
              <button class={this.state.showBlockInfo ? "information-button-black" : "information-button-white"} onClick={this.handleShowBlockInfo}>
                <img src={this.state.showBlockInfo ? "img/ginar-information-icon.svg" : "img/ginar-information-icon-invert.svg"} alt="Ginar Information Icon"/>
                <div class={this.state.showBlockInfo ? "information-text-white" : "information-text-black"}>&nbsp;&nbsp;Block Information</div>
              </button>
              <button class={this.state.showBlockInfo ? "information-button-white" : "information-button-black"} onClick={this.handleHideBlockInfo}>
                <img src={this.state.showBlockInfo ? "img/ginar-json-icon.svg" : "img/ginar-json-icon-invert.svg"} alt="GINAR JSON Icon"/>
                <div class={this.state.showBlockInfo ? "information-text-black" : "information-text-white"}>&nbsp;&nbsp;JSON Data</div>
              </button>
            </div>
            <div class="information-main">
              <div class={this.state.showBlockInfo ? "d-none" : "json-outer"}>
                <button class="copy-json" onClick={this.handleCopyJSON}> Copy Json</button>
                <textarea class="json-data" id="json-data" value={JSON.stringify(this.state.data, null, 2)} readOnly={true}/>
              </div>
              <div class="information-block">
                <table class={this.state.showBlockInfo ? "information-block-main" : "d-none"}>
                  <tbody>
                    <tr>
                      <th>Transaction Hash:</th>
                      <td>
                        <p>{this.state.data ? (this.state.data.txhash ? "0x" + this.state.data.txhash : "(pending) - Please refresh this page later!") : "(pending)"}</p>
                      </td>
                    </tr>
                    <tr class="dark-record">
                      <th>Ticket Hash:</th>
                      <td>
                        <p>{this.state.data ? "0x" + this.state.data.tickethash : "(pending)"}</p>
                      </td>
                    </tr>
                    <tr>
                      <th>Output:</th>
                      <td>
                        <p>{this.state.data ? "0x" + this.state.data.output : "(pending)"}</p>
                      </td>
                    </tr>
                    <tr class="dark-record">
                      <th>Block Number:</th>
                      <td>
                        <p id="block-number-id">{this.state.blockInfoData ? parseInt(this.state.blockInfoData.blockNumber, 16) : "(pending)"}</p>
                      </td>
                    </tr>
                    <tr>
                      <th>Block Hash:</th>
                      <td>
                        <p>{this.state.blockInfoData ? this.state.blockInfoData.blockHash : "(pending)"}</p>
                      </td>
                    </tr>
                    <tr class="dark-record">
                      <th>From:</th>
                      <td>
                        <p>{this.state.blockInfoData ? this.state.blockInfoData.from : "(pending)"}</p>
                      </td>
                    </tr>
                    <tr>
                      <th>To:</th>
                      <td>
                        <p>{this.state.blockInfoData ? this.state.blockInfoData.to : "(pending)"}</p>
                      </td>
                    </tr>
                    <tr class="dark-record">
                      <th>Gas:</th>
                      <td>
                        <p>{this.state.blockInfoData ? parseInt(this.state.blockInfoData.gas, 16) + " Gas (" + this.formatPrice(parseInt(this.state.blockInfoData.gas, 16)*parseInt(this.state.blockInfoData.gasPrice, 16)*1e-18, 18) + " Ether)" : "(pending)"}</p>
                      </td>
                    </tr>
                    <tr>
                      <th>Gas Price:</th>
                      <td>
                        <p>{this.state.blockInfoData ? parseInt(this.state.blockInfoData.gasPrice, 16) + " Wei (" + this.formatPrice(parseInt(this.state.blockInfoData.gasPrice, 16)*1e-18, 18) + " Ether)" : "(pending)"}</p>
                      </td>
                    </tr>
                    <tr class="dark-record">
                      <th>Input:</th>
                      <td>
                        <p>{this.state.blockInfoData ? this.state.blockInfoData.input : "(pending)"}</p>
                      </td>
                    </tr>
                    <tr>
                      <th>Nonce:</th>
                      <td>
                        <p>{this.state.blockInfoData ? parseInt(this.state.blockInfoData.nonce, 16) : "(pending)"}</p>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            <div class="list-of-pod">
              <h2>List of PODs (Proof of Designations)</h2>
              <table class="list-of-pod-table">
                <thead class="">
                  <tr>
                    <th width="3%">#</th>
                    <th width="7%">Timestamp</th>
                    <th width="15%">Public Key</th>
                    <th width="30%">Credencial</th>
                    <th width="15%">Contribution</th>
                    <th width="30%">Signature</th>
                  </tr>
                </thead>
                <tbody>
                    {this.state.data ? this.state.data.proofs.map((pod, i) => {
                      return (
                        <tr key={'pod-' + (i+1)} class={i%2 === 1 ? "dark-record" : ""}>
                          <td>{i+1}</td>
                          <td>{new Date(pod.timestamp).toUTCString()}</td>
                          <td>{pod.publickey}</td>
                          <td>{pod.credential}</td>
                          <td>{pod.contribution}</td>
                          <td>{pod.signature}</td>
                        </tr>
                      )
                    }) : String.empty}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

export default VerifyForm;
