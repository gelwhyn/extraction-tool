<?php
// Initialize the session
session_start();
 
// Check if the user is logged in, if not then redirect him to login page
// if(!isset($_SESSION["loggedin"]) || $_SESSION["loggedin"] !== true){
//     header("location: /");
//     exit;
// }
?>
<!DOCTYPE html>
<html>
  <head>
    <title>Extract Page Designer Library | Datawords</title>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, minimum-scale=1.0, initial-scale=1.0, user-scalable=yes">
    <link rel="stylesheet" href="css/dtw-preloading.css">
    <link rel="stylesheet" href="css/style.css">
  </head>
  <body>
    <!--LOADER-->
    <div id="load">
      <div class="dtw-loader-cnt">
        <div class="cssload-loader">
          <div class="cssload-square cssload-square--main">
            <div class="cssload-square cssload-square--mini"></div>
            <div class="cssload-square cssload-square--mini"></div>
            <div class="cssload-square cssload-square--mini"></div>
            <div class="cssload-square cssload-square--mini"></div>
            <div class="cssload-square cssload-square--mini"></div>
            <div class="cssload-square cssload-square--mini"></div>
            <div class="cssload-square cssload-square--mini"></div>
            <div class="cssload-square cssload-square--mini"></div>
            <div class="cssload-square cssload-square--mini"></div>
            <div class="cssload-square cssload-square--mini"></div>
            <div class="cssload-square cssload-square--mini"></div>
            <div class="cssload-square cssload-square--mini"></div>
            <div class="cssload-square cssload-square--mini"></div>
            <div class="cssload-square cssload-square--mini"></div>
            <div class="cssload-square cssload-square--mini"></div>
            <div class="cssload-square cssload-square--mini"></div>
          </div>
        </div>
        <div class="cssload-loading">DATAWORDS</div>
      </div>
    </div>
    <!--END OF LOADER -->
    <!-- CONTENT HERE-->
    <div class="contents" id="spprtd">
      <div class="dtw-main-logo">
        <a href="/">
          <img loading="lazy" src="img/sfcc-logo-v2.png" alt="datawords logo white" height="auto" width="auto" style="width: 100%;" />
        </a>
      </div>
      <div id="app" class="card">
        <div class="dtw-sfcc-logo-sec">
          <img loading="lazy" src="img/sfcc-logo.png" class="dtw-sfcc-logo" alt="datawords sfcc">
        </div>
        <h1 class="neons">Extract Category</h1>
        <form name="page-designer-library" id="form-pd">
          <div>
            <label for="library-input">Navigation XML:</label>
            <input type="file" id="library-input" required />
          </div>
          <div>
            <label for="pageids-textarea">Category IDs (comma separated values):</label>
            <textarea name="pageids" id="pageids-textarea" placeholder="cat1-id, cat2-id, cat3-id" required></textarea>
          </div>
          <div>
            <!-- <label for="baseurl-input">Base URL</label> -->
            <input type="text" name="baseURL" id="baseurl-input" placeholder="Base URL Link" style="display:none;">
          </div>
          <div>
            <input type="checkbox" id="checkbox-input" name="isDownload" />
            <label for="checkbox-input">
              Download Images in the XML?
            </label>
            <div class="tooltip">
              <img loading="lazy" src="img/question-icon.png" alt="question icon" height="auto" width="auto" style="width: 80%;" />
              <span class="tooltiptext">Make sure that the image paths in the xml file is configured correctly (no spaces)</span>
            </div>
          </div>
          <div class="form-actions" id="button-submit">
            <button class="button-convert">Convert and download</button>
          </div>
        </form>
        <div class="loading-container">
          <div class="loadingspinner"></div>
        </div>
        <div id="info-messages"></div>
      </div>
    </div>
    <!--END OF CONTENT-->
        <!--MOBILE-->
        <div id="not-supported-section">
          <div class="ntspprtd">
            <img src="img/404.png">
            <p>Sorry, this site is not supported of <br>tablet and mobile device </p>
          </div>
        </div>
        <!--MOBILE-->
        <!--BACKGROUND-->
        <div class="area">
          <ul class="circles">
            <li></li>
            <li></li>
            <li></li>
            <li></li>
            <li></li>
            <li></li>
            <li></li>
            <li></li>
            <li></li>
            <li></li>
          </ul>
        </div>
        <div class="ocean">
          <div class="wave"></div>
          <div class="wave"></div>
        </div>
        <!-- END OF BACK GROUND-->
        <script src="js/category-extract-v2.js"></script>
        <script src="js/dtw-preloading.js"></script>
        <script type="module" src="js/jszip.js"></script>
        <script type="module" src="js/filesaver.js"></script>
  </body>
</html>