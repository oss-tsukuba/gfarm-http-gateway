function encodePath(path) {
    let p = '/' + path.replace(/^\/+/, "").replace(/\/+$/, "");
    // URL encode without slash
    return p.replace(/[^/]/g, encodeURIComponent);
}

function removeLastSlash(text) {
    return text.replace(/\/+$/, "");
}

function basename(path) {
    return path.split("/").pop();
}

async function oauthInfoShow(tableElem, btnElem) {
    const tableContainer = document.getElementById(tableElem);
    const toggleButton = document.getElementById(btnElem);
    if (tableContainer) {
        const table = tableContainer.querySelector('table');
        if (table.style.display === 'none') {
            table.style.display = 'table';
            toggleButton.textContent = 'Hide';
        } else {
            table.style.display = 'none';
            toggleButton.textContent = 'Show';
        }
    }
}

// TODO simplify
async function whoami1() {
    const whoamiOut = document.getElementById('whoami_out1');
    try {
        const response = await fetch('./c/me');
        if (!response.ok) {
            throw new Error(`HTTP error: ${response.status}`);
        }
        const text = await response.text();
        whoamiOut.textContent = text;
    } catch (error) {
        console.error('Error fetching data:', error);
        whoamiOut.textContent = error;
    }
}

async function whoami2() {
    const whoamiURL = document.getElementById('whoami_url2').value;
    const whoamiOut = document.getElementById('whoami_out2');
    try {
        const response = await fetch('/access_token');
        if (!response.ok) {
            throw new Error(`HTTP error: ${response.status}`);
        }
        const url = removeLastSlash(whoamiURL) + "/c/me";
        const data = await response.json();
        const response2 = await fetch(url, {
            headers: {
                'Authorization': 'Bearer ' + data.access_token,
            }
        });
        if (!response2.ok) {
            throw new Error(`HTTP error: ${response.status}`);
        }
        const text = await response2.text();
        whoamiOut.textContent = text;
    } catch (error) {
        console.error('Error fetching data:', error);
        whoamiOut.textContent = error;
    }
}

async function whoami3() {
    const whoamiURL = document.getElementById('whoami_url3').value;
    const whoamiOut = document.getElementById('whoami_out3');
    try {
        const url = removeLastSlash(whoamiURL) + "/c/me";
        const atElement = document.getElementById('access_token');
        const access_token = atElement.textContent;
        const response = await fetch(url, {
            headers: {
                'Authorization': 'Bearer ' + access_token,
            }
        });
        if (!response.ok) {
            throw new Error(`HTTP error: ${response.status}`);
        }
        const text = await response.text();
        whoamiOut.textContent = text;
    } catch (error) {
        console.error('Error fetching data:', error);
        whoamiOut.textContent = error;
    }
}

// not ANONYMOUS
async function whoamiWithoutAuth() {
    const whoamiURL = document.getElementById('whoami_url4').value;
    const whoamiOut = document.getElementById('whoami_out4');
    try {
        const url = removeLastSlash(whoamiURL) + "/c/me";
        const response = await fetch(
            url,
            {
                headers: {
                    'Authorization': 'Bearer ' + "DUMMY",
                }
            });
        const text = await response.text();
        whoamiOut.textContent = text;
        //if (!response.ok) {
        //    throw new Error(`HTTP error: ${response.status}`);
        //}
    } catch (error) {
        console.error('Error:', error);
        whoamiOut.textContent = error;
    }
}

// ANONYMOUS
async function whoamiAnonymous() {
    const whoamiURL = document.getElementById('whoami_url5').value;
    const whoamiOut = document.getElementById('whoami_out5');
    try {
        const url = removeLastSlash(whoamiURL) + "/c/me";
        const response = await fetch(
            url,
        );
        const text = await response.text();
        whoamiOut.textContent = text;
    } catch (error) {
        console.error('Error:', error);
        whoamiOut.textContent = error;
    }
}

async function list() {
    const lsPath = document.getElementById('ls_path');
    const lsOut = document.getElementById('ls_out');
    const lsRecursive = document.getElementById('ls_recursive');
    const lsIgnoreError = document.getElementById('ls_ign_err');
    const path = lsPath.value.replace(/^\/+/g, "");
    try {
        let api_dir = "./d";
        let fullpath = api_dir + "/" + path + "?a=1";
        if (lsRecursive.checked) {
            fullpath += "&R=1";
        }
        if (lsIgnoreError.checked) {
            fullpath += "&ign_err=1";
        }
        const response = await fetch(fullpath);
        if (!response.ok) {
            const text = await response.text();
            throw new Error(`HTTP ${response.status}: ${text}`);
        }
        //const data = await response.json();
        //lsOut.textContent = JSON.stringify(data, null, 2);
        const text = await response.text();
        lsOut.textContent = text;
    } catch (error) {
        console.error('Error fetching data:', error);
        lsOut.textContent = error;
    }
}

async function downloadFile() {
    const progressBar = document.getElementById('download-progress');
    const progressText = document.getElementById('download-progress-text');
    const cancelButton = document.getElementById('download-cancel');
    let path = document.getElementById("export_path").value;
    if (path) {
        let filename = basename(path);
        const epath = encodePath(path)
        const dlurl = `/file${epath}?action=download`;
        try {
            const startTime = Date.now();
            const xhr = new XMLHttpRequest();
            xhr.open('GET', dlurl);
            xhr.responseType = 'blob';

            cancelButton.addEventListener('click', function() {
                progressText.textContent = "Canceled";
                xhr.abort();
            });

            xhr.onprogress = (event) => {
                if (event.lengthComputable) {
                    const percent = Math.floor((event.loaded / event.total) * 100);
                    const elapsedTime = Date.now() - startTime;  // msec.
                    const speed = Math.round(event.loaded / elapsedTime * 1000);
                    const sec = Math.floor(elapsedTime / 1000)
                    progressBar.value = percent;
                    progressText.textContent = `${event.loaded} / ${event.total} | ${percent} % | ${sec} sec | ${speed} bytes/sec)`;
                    console.log('downloaded: %d / %d (%d %)', event.loaded, event.total, percent);
                }
            };

            xhr.onload = () => {
                const contentDisposition = xhr.getResponseHeader('Content-Disposition');
                if (contentDisposition) {
                    // RFC 5987,8187
                    let fnMatch = contentDisposition.match(/filename\*=UTF-8\'\'([^"]+)/);
                    if (fnMatch) {
                        downloadedFilename = decodeURIComponent(fnMatch[1]);
                    } else {
                        const fnMatch = contentDisposition.match(/filename="([^"]+)"/);
                        if (fnMatch) {
                            filename = decodeURIComponent(fnMatch[1]);
                        }
                    }
                }

                if (xhr.status >= 200 && xhr.status < 300) {
                    const blob = xhr.response;
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = filename;
                    a.style.display = 'none';
                    document.body.appendChild(a);
                    a.click();
                    window.URL.revokeObjectURL(url);
                    document.body.removeChild(a);
                } else {
                    progressText.textContent = `Error: HTTP ${xhr.status}: ${xhr.statusText}`;
                    console.error(progressText.textContent);
                }
            };

            xhr.onerror = () => {
                progressText.textContent = 'Network error';
                console.error('Network error');
            };

            xhr.send();
        } catch(error) {
            alert("Error: " + error.message);
            console.error(error);
        };
    } else {
        alert("Please input Gfarm path");
    }
}

async function dirCommon(pathId, outputId, method, message) {
    const path = document.getElementById(pathId).value;
    const output = document.getElementById(outputId);
    if (path) {
        const epath = encodePath(path)
        try {
            const url = `/dir${epath}`
            const response = await fetch(url, {
                method: method
            });
            if (!response.ok) {
                const text = await response.text();
                throw new Error(`HTTP ${response.status}: ${text}`);
            }
            output.textContent = `Success (${message})`;
        } catch (error) {
            console.error(error);
            output.textContent = error;
        }
    } else {
        alert("Please input Gfarm path");
    }
}

async function createDir() {
    await dirCommon("mkdir_path", "mkdir_output", "PUT", "created");
}

async function removeDir() {
    await dirCommon("rmdir_path", "rmdir_output", "DELETE", "removed");
}

async function move() {
    const src = document.getElementById("mv_src").value;
    const dest = document.getElementById("mv_dest").value;
    const input = document.getElementById("mv_input");
    const output = document.getElementById("mv_output");
    if (src && dest) {
        const data = JSON.stringify({
            "source": src,
            "destination": dest,
        }, null, 2);
        input.textContent = data;

        try {
            const url = `/move`
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    "Content-Type": "application/json"
                },
                body: data
            });
            if (!response.ok) {
                const text = await response.text();
                throw new Error(`HTTP ${response.status}: ${text}`);
            }
            output.textContent = `Success (moved)`;
        } catch (error) {
            console.error(error);
            output.textContent = error;
        }
    } else {
        alert("Please input Gfarm path");
    }
}

async function stat() {
    const path = document.getElementById("stat_path").value;
    const output = document.getElementById("stat_output");
    if (path) {
        let filename = basename(path);
        const epath = encodePath(path)
        const url = `/attr${epath}`
        try {
            const response = await fetch(url);
            if (!response.ok) {
                const text = await response.text();
                throw new Error(`HTTP ${response.status}: ${text}`);
            }
            output.textContent = JSON.stringify(await response.json(), null, 2);
        } catch (error) {
            console.error(error);
            output.textContent = error;
        }
    } else {
        alert("Please input Gfarm path");
    }
}

async function chmod() {
    const path = document.getElementById("chmod_path").value;
    const mode = document.getElementById("chmod_mode").value;
    const input = document.getElementById("chmod_input");
    const output = document.getElementById("chmod_output");
    if (path) {
        let filename = basename(path);
        const epath = encodePath(path)
        const url = `/attr${epath}`

        const data = JSON.stringify({
            "Mode": mode,
        }, null, 2);
        input.textContent = data;

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    "Content-Type": "application/json"
                },
                body: data
            });
            if (!response.ok) {
                const text = await response.text();
                throw new Error(`HTTP ${response.status}: ${text}`);
            }
            output.textContent = `Success (mode updated)`;
        } catch (error) {
            console.error(error);
            output.textContent = error;
        }
    } else {
        alert("Please input Gfarm path");
    }
}
