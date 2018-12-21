import React, { Component } from 'react';
import './App.css';
import VerifyForm from './VerifyForm.js';

class App extends Component {
  render() {
    return (
      <div>
        <div class="header">
          <div class="navigation-bar">
            <div class="ginar-logo">
              <img src="img/logo2.svg" alt="GINAR Logo"/>
            </div>
            <div class="ginar-random-verification-tool">
              <h1>GINAR RANDOM VERIFICATION TOOL</h1>
            </div>
          </div>
        </div>
        <div class="body">
          <VerifyForm />
        </div>
        <footer class="footer" id="footer">
          <div class="container">
            <div class="pull-top">
              <div class="share-buttons">
                <p class="share-message">Follow Us</p>
                <a href="https://www.facebook.com/GINARProject" target="_blank" rel="noopener noreferrer">
                  <img src="img/logo-share-facebook.svg" alt="Facebook"/>
                </a>
                <a href="https://twitter.com/GINAR_io" target="_blank" rel="noopener noreferrer">
                  <img src="img/logo-share-twitter.svg" alt="Twitter"/>
                </a>
                <a href="https://medium.com/ginar-io" target="_blank" rel="noopener noreferrer">
                  <img src="img/logo-share-medium.svg" alt="Medium"/>
                </a>
                <a href="https://t.me/GINAR_io" target="_blank" rel="noopener noreferrer">
                  <img src="img/logo-share-telegram.svg" alt="Telegram"/>
                </a>
                <a href="https://github.com/ginarteam" target="_blank" rel="noopener noreferrer">
                  <img src="img/logo-share-github.svg" alt="Github"/>
                </a>
              </div>
            </div>
            <div class="pull-bottom">
              <a class="text-email" href="mailto:support@ginar.io">support@ginar.io</a>
              <span class="text-copyright">© 2018 GINAR. All rights reserved.</span>
            </div>
          </div>
        </footer>
      </div>
    );
  }
}

export default App;
