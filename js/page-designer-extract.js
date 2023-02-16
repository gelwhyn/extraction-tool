const inputElement = document.getElementById("library-input");
const form = document.getElementById("form-pd");
const checkBox = document.getElementById("checkbox-input");
const baseUrlInput = document.getElementById("baseurl-input");

form.addEventListener("submit", handleUploadedFile, false);

checkBox.addEventListener("click", function(){
  if(checkBox.checked){
    document.getElementById("baseurl-input").style.display = 'block';
    document.getElementById("baseurl-input").setAttribute("required", "");
  }else{
    document.getElementById("baseurl-input").style.display = 'none';
    document.getElementById("baseurl-input").removeAttribute("required");
  }

}, false)

function handleUploadedFile(event) {
  document.getElementById("info-messages").innerHTML = "";
  event.preventDefault();
  const isDownloadImagesChecked = document.getElementById("checkbox-input").checked;

  const textArea = document.getElementById("pageids-textarea");
  const pageIDs = textArea.value
    .trim()
    .split(",")
    .map((pageID) => {
      return pageID.trim();
    });
  const library =
    inputElement.files && inputElement.files.length && inputElement.files[0];
  const fileName = library.name;
  document.getElementById("trial-messages").innerText = library.name;
  document.getElementById("app").classList.add("loading");
  getXMLDoc(library).then((xml) => {
    if (xml && xml instanceof XMLDocument) {
      getPDAssets(pageIDs, xml, fileName, isDownloadImagesChecked);
    } else {
      addMessage(`File "${fileName}" can not be parsed.`, "error");
    }
  });
}

function getXMLDoc(inputFile) {
  const fileReader = new FileReader();
  return new Promise((resolve, reject) => {
    fileReader.onerror = () => {
      fileReader.abort();
      reject(new DOMException("Problem parsing input file."));
    };
    fileReader.onload = () => {
      var fileText = fileReader.result;
      var parser = new DOMParser();
      var xmlDoc = parser.parseFromString(fileText, "text/xml");
      resolve(xmlDoc);
    };
    fileReader.readAsText(inputFile);
  });
}

function getAsset(id, xml) {
  var xpath = `/*[local-name()='library']/*[local-name()='content'][@content-id="${id}"]`;
  var result;
  if (xml.evaluate) {
    var nodes = xml.evaluate(xpath, xml, null, XPathResult.ANY_TYPE, null);
    var nextElement = nodes.iterateNext();
    while (nextElement) {
      result = nextElement;
      nextElement = nodes.iterateNext();
    }
  } else if (window.ActiveXObject) {
    xml.setProperty("SelectionLanguage", "XPath");
    nodes = xml.selectNodes(xpath);
    result = nodes && nodes[0];
  }
  return result;
}

function getRelatedAssets(asset) {
  var relatedAssets = [];
  var contentLinks = asset.getElementsByTagName("content-links");
  Array.from(contentLinks).forEach((element) => {
    relatedAssets = relatedAssets.concat(
      Array.from(element.getElementsByTagName("content-link")).map(
        (contentLink) => {
          return contentLink.getAttribute("content-id");
        }
      )
    );
  });
  return relatedAssets;
}

function getPDAssets(pageIDs, xml, fileName, isDownloadImagesChecked) {
  const xmlEncoding = '<?xml version="1.0" encoding="UTF-8"?>\n';
  const libraryNode = xml.getElementsByTagName("library")[0];
  if (!libraryNode) {
    addMessage(
      `"library" node was not found in file "${fileName}". Please verify xml structure.`,
      "error"
    );
    document.getElementById("app").classList.remove("loading");
    return;
  }
  const library = libraryNode.cloneNode(true);
  library.innerHTML = "";
  let pageFound = false;
  pageIDs.forEach((pageID) => {
    let root = getAsset(pageID, xml);
    if (root) {
      let ids = [pageID];
      let assets = [root];
      pageFound = true;
      while (assets.length) {
        let asset = assets.pop();
        let relatedAssets = getRelatedAssets(asset);
        library.appendChild(document.createTextNode("\n\n    "));
        // console.log(library, "libraryaSSET")
        // console.log(Object.keys(asset), "keys")
        library.appendChild(asset);
        relatedAssets.forEach((id) => {
          let currentAsset = getAsset(id, xml);
          if (currentAsset) {
            assets.push(getAsset(id, xml));
            ids.push(id);
          } else {
            addMessage(
              `One of related asset "${id}" is missed for page "${pageID}"`,
              "error"
            );
          }
        });
      }
    } else {
      addMessage(`Page "${pageID}" is not found. Skipping..`, "warning");
    }
  });
  library.appendChild(document.createTextNode("\n\n"));

  if (pageFound) {
    console.log(isDownloadImagesChecked, "checker")
    var images = [
      "https://upload.wikimedia.org/wikipedia/commons/9/91/JavaScript_screenshot.png",
      "https://images.milanuncios.com/api/v1/ma-ad-media-pro/images/296b1d59-04bf-46e4-a449-6815a222dbf5?rule=hw545",
      "https://lets-code-more.s3.amazonaws.com/static/assets/imgs/theme/COMPUTER.jpg",
      "https://lets-code-more.s3.amazonaws.com/media/blog_images/javascript.jpg",
    ];
    if(isDownloadImagesChecked){
      // getImageAssets(images);

      getImageAssets(getImagePaths(library.outerHTML));
    }
    download(fileName, xmlEncoding + library.outerHTML);
    addMessage(`Library xml is successfully filtered.`, "success");
  } else {
    addMessage("No pages found.", "error");
  }
  document.getElementById("app").classList.remove("loading");
}

function download(filename, text) {
  var element = document.createElement("a");
  element.setAttribute(
    "href",
    "data:text/xml;charset=utf-8," + encodeURIComponent(text)
  );
  element.setAttribute("download", filename);
  element.setAttribute("target", "_blank");

  console.log(filename, "FILENAME");

  element.style.display = "none";
  document.body.appendChild(element);

  element.click();

  document.body.removeChild(element);
}

function addMessage(message, type) {
  var cssClass = "";
  switch (type) {
    case "error":
      cssClass = "error-msg";
      break;
    case "warning":
      cssClass = "warning-msg";
      break;
    case "info":
      cssClass = "info-msg";
      break;
    case "success":
      cssClass = "success-msg";
      break;
    default:
      cssClass = "success-msg";
      break;
  }
  var notification = document.createElement("div");
  notification.classList.add(cssClass);
  notification.innerHTML = message;
  document.getElementById("info-messages").appendChild(notification);
}

function getImagePaths(filteredFile) {
  var parser = new DOMParser();
  var xmlDoc = parser.parseFromString(filteredFile, "text/xml");
  const baseURL = baseUrlInput.value

  let imagePaths = [];
  let child = xmlDoc.childNodes
  child.forEach(element => {
    console.log(element)
    let dataContentText = element.textContent;
    imagePaths = (dataContentText.match(/[^"'<>\n\t\s]+\.(?:png|jpe?g|gif)\b/gi));
  });

  console.log(imagePaths, "paths")

  return imagePaths;
}

async function fetchImage(imageURL){
  return await fetch(imageURL, {
    //uncomment mode to try with no-cors
    // mode: 'no-cors',
    method: "get",
    // headers: {
    //   'Content-Type': 'image/jpeg',
    // //   'Accept': 'image/*'
    // },
  })
}

async function getImageBlob(imageFetched){
  return await imageFetched.blob()
  // const imageBlob = new Blob([imageFetched], {
  //   type: "image/" + filetype
  // })
}

async function getImageAssets(imagePaths) {
  var count = 0;
  var zip = new JSZip();
  var img = zip.folder("images");
  const baseURL = baseUrlInput.value
  const baseUrlEndsWithSlash = baseURL.endsWith("/") 

  // for (let imagePath of imagePaths) {

  //   let filename = imagePath.substring(imagePath.lastIndexOf("/") + 1);
  //   let fileExt = filename.split('.').pop();

    //UNCOMMENT HERE!!
    // var zipFilename = "images_bundle1.zip";
    // // we will download these images in zip file
    // const image = fetch (imagePath)
    // image.then((response)=> {
    //   console.log(response, "response here")
    // })
    // var imageBlob = image.blob()
    
    // console.log(
    //   baseURL +
    //    imagePath,
    //   "url here"
    // );
 
    //   console.log(image, "image fetch")
    //   console.log(imageBlob, "blob")
  
    // img.file(filename, imageBlob);
    // count++;
    // console.log(count, "count");

    // if (count == imagePaths.length) {
    //   console.log("entered here");
    //   zip.generateAsync({ type: "blob" }).then(function (content) {
    //     saveAs(content, zipFilename);
    //   });
    // }
  // }
var zipFilename = "images_bundle2.zip";
  imagePaths.forEach(async function (imgURL, i) {

    if(baseUrlEndsWithSlash){
      console.log("entered first if")
      if(imgURL.startsWith("/")){
        console.log("entered second if")
        imgURL = imgURL.substring(1)
        console.log(imgURL, "here")
      }
    }else{
      if(!imgURL.startsWith("/")){
        imgURL = "/" + imgURL
    }
  }

    
    console.log(baseURL + imgURL, "hello link")
    //trial 1
    // console.log(i);
    // let filename = imgURL.substring(imgURL.lastIndexOf("/") + 1);
    // var image = fetch(imgURL);
    // // var image = await fetch(baseURL + imgURL,);

    // //image.then(response => console.log(response))
    // console.log(image, "image")
    // var imageBlob = await image.blob();
    // var img = zip.folder("images");
    // // loading a file and add it in a zip file
    // img.file(filename, imageBlob, { binary: true });
    // count++;
    // if (count == imagePaths.length) {
    //   zip.generateAsync({ type: "blob" }).then(function (content) {
    //     saveAs(content, zipFilename);
    //   });
    // }

    //trial 2 - tested with yung publicly accessible images but encounters the same output (zipped file with 0 size)
    // const fetchResponse = fetchImage(imgURL).then(async response => {
    // let filename = imgURL.substring(imgURL.lastIndexOf("/") + 1);
  
    // console.log(await response.blob(), "resp")
    // const imageBlob = getImageBlob(response).then((imageBlob) => {
    //   console.log(imageBlob, "imgblob")
    //   var img = zip.folder("images");
    //   // loading a file and add it in a zip file
    //   img.file(filename, imageBlob, { binary: true });
    //   count++;
            
    //   console.log(count, "count")
    //   if (count == imagePaths.length) {
    //     zip.generateAsync({ type: "blob" }).then(function (content) {
    //       saveAs(content, zipFilename);
    //     });
    //   }
    // })
  // })

    //trial 3 - works with the publicly accessible image paths, (but if may "no-cors") it wont work.
    const fetchResponse = fetchImage(baseURL + imgURL).then(async response => {
      let filename = imgURL.substring(imgURL.lastIndexOf("/") + 1);
      let filetype = filename.split('.').pop();

      const imageBlob = await response.blob()
      console.log(imageBlob, "imgblob")
      var img = zip.folder("images");
      // loading a file and add it in a zip file
      img.file(filename, imageBlob, { binary: true });
      count++;
            
      console.log(count, "count")
      if (count == imagePaths.length) {
        zip.generateAsync({ type: "blob" }).then(function (content) {
          saveAs(content, zipFilename);
        });
      }
    });

    //trial 4 - open link/images in new tab (no download)
      // let filename = imgURL.substring(imgURL.lastIndexOf("/") + 1);
      // let element = document.createElement('a')
      // element.setAttribute("href", baseURL + imgURL);

      // element.setAttribute("download", filename);
      // element.setAttribute("target", "_blank");

      // document.getElementById("trial-messages").appendChild(element)
      // element.click()

    //trial 5 - using file() to build the response
    //   const fetchResponse = fetchImage(baseURL + imgURL).then(async response => {
    //   let filename = imgURL.substring(imgURL.lastIndexOf("/") + 1);
    //   let filetype = filename.split('.').pop();

    //   const imageBlob = new File([response], filename, {type: `image/${filetype}`})
    //   imageBlob.src = baseURL + imgURL
    //   console.log(imageBlob, "imgblob")
    //   // document.getElementById("trial-messages").appendChild(imageBlob)
    //   var img = zip.folder("images");
    //   // loading a file and add it in a zip file
    //   img.file(filename, imageBlob, { binary: true });
    //   count++;
            
    //   console.log(count, "count")
    //   if (count == imagePaths.length) {
    //     zip.generateAsync({ type: "blob" }).then(function (content) {
    //       saveAs(content, zipFilename);
    //     });
    //   }
    // });

    //trial 5 - using file() to build the response
    // const fetchResponse = fetchImage(baseURL + imgURL).then(async response => {
    //   let filename = imgURL.substring(imgURL.lastIndexOf("/") + 1);
    //   let filetype = filename.split('.').pop();

    //   const imageBlob = new File([response], filename, {type: `image/${filetype}`})
    //   imageBlob.src = baseURL + imgURL
    //   console.log(imageBlob, "imgblob")
    //   // document.getElementById("trial-messages").appendChild(imageBlob)
    //   var img = zip.folder("images");
    //   // loading a file and add it in a zip file
    //   img.file(filename, imageBlob, { binary: true });
    //   count++;
            
    //   console.log(count, "count")
    //   if (count == imagePaths.length) {
    //     zip.generateAsync({ type: "blob" }).then(function (content) {
    //       saveAs(content, zipFilename);
    //     });
    //   }
    // });
})
}