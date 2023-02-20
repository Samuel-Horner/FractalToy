/* --- ENGINE CODE --- */
    /* PROGRAM GLOBALS */
    var resolution = 500;
    var canvas;
    var gl;
    var buffer;
    var shaderScript;
    var shaderSource;
    var vertexShader;
    var fragmentShader;
    var frameCount = 0;
    var m = {x:0,y:0};
    var then;
    var now;
    var fpsInterval = 1000 / 60;
    var startTime;
    /* UNIFORM LOCATIONS */
    var u_TimeLoc;
    var u_MouseLoc;
    var colorLoc;
    var renderModeLoc;
    var resolutionLoc;
    /* UNIFORM DATA */
    var renderMode = true;
    /* TEXTURES */
    var tex;
    /* INITIALISE CONTEXT */
    window.onload = init;
    async function init(){
        canvas = document.getElementById("glscreen");
        canvas.onmousemove = mCoords;
    
        gl = canvas.getContext("webgl");
        canvas.width = resolution;
        canvas.height = resolution;
        gl.viewport(0,0,gl.drawingBufferWidth, gl.drawingBufferHeight);
        buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(
            gl.ARRAY_BUFFER,
            new Float32Array([
                -1.0, -1.0,
                1.0, -1.0,
                -1.0, 1.0,
                -1.0, 1.0,
                1.0, -1.0,
                1.0, 1.0]),
            gl.STATIC_DRAW
        );
        shaderSource = await loadVertex().then(response => {return response.text()});
        vertexShader = gl.createShader(gl.VERTEX_SHADER);
        gl.shaderSource(vertexShader, shaderSource);
        gl.compileShader(vertexShader);
    
        shaderSource = await loadFragment().then(response => {return response.text()});
        fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
        gl.shaderSource(fragmentShader, shaderSource);
        gl.compileShader(fragmentShader);
    
        program = gl.createProgram();
        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);	
        gl.useProgram(program);
    
        /* Set initial colours */
        var colorInputs = document.getElementById("color-array").children;
        // Default gradient
        var colorArray = [[25,7,26],[9,1,47],[4,4,73],[0,7,100],[12,44,138],[24,82,177],[57,125,209],[134,181,229],[211,236,248],[241,233,191],[248,201,95],[255,170,0],[204,128,0],[153,87,0],[106,52,3]];
        for (i = 0; i < colorInputs.length; i++){
            colorInputs[i].value = rgbToHex(colorArray[i]);
        }

        /* TEXTURES */
        applyGradient();
    
        /* UNIFORMS */
        u_TimeLoc = gl.getUniformLocation(program,'u_Time');
        u_MouseLoc = gl.getUniformLocation(program,'u_Mouse');
        colorLoc = gl.getUniformLocation(program,'colors');
        renderModeLoc = gl.getUniformLocation(program,'renderMode');
        resolutionLoc = gl.getUniformLocation(program,'resolution');
    
        then = Date.now();
        startTime = then;
    
        render();
    }

    function applyGradient(){
        var colorInputs = document.getElementById("color-array").children;
        var colorArray = [];
        for (var i = 0; i < colorInputs.length; i++){
            colorArray.push(hexToRgb(colorInputs[i].value));
        }
        createTex(colorArray);
    }

    // https://stackoverflow.com/questions/5623838/rgb-to-hex-and-hex-to-rgb
    // Modified to accept [r,g,b]
    function rgbToHex(col) {
        return "#" + (1 << 24 | col[0] << 16 | col[1] << 8 | col[2]).toString(16).slice(1);
    }

    // https://stackoverflow.com/questions/5623838/rgb-to-hex-and-hex-to-rgb
    // Modified to return [r,g,b]
    function hexToRgb(hex) {
        var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        result = {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16)
        };
        return [result.r,result.g,result.b];
    }
    
    function loadFragment(){
        return fetch('fragment.glsl');
    }

    function loadVertex(){
        return fetch('vertex.glsl');
    }
    
    function render() {
        window.requestAnimationFrame(render, canvas);
    
        gl.viewport(0,0,gl.drawingBufferWidth, gl.drawingBufferHeight);
        gl = canvas.getContext("webgl");
    
        now = Date.now();
        elapsed = now - then;
        then = now - (elapsed % fpsInterval);
    
        if (elapsed < fpsInterval){return;}
    
        fps = Math.round(frameCount / (now - startTime) * 1000);
        document.getElementById("fps-display").innerHTML = `FPS: ${fps} MSPT: ${Math.round(elapsed)}`;
    
    
        gl.clearColor(1.0,0.5,0.5,1.0);
        gl.clear(gl.COLOR_BUFFER_BIT);
    
        positionLocation = gl.getAttribLocation(program, "a_position");
        gl.enableVertexAttribArray(positionLocation);
        gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
    
        gl.uniform1f(u_TimeLoc, frameCount / 60);
        gl.uniform2f(u_MouseLoc, m.x, m.y);
        gl.uniform1i(renderModeLoc,renderMode);
        gl.uniform1f(resolutionLoc, resolution)
    
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.uniform1i(colorLoc, 0);
    
        gl.drawArrays(gl.TRIANGLES, 0, 6);
        frameCount += 1;
    }
    
    function mCoords(event){
        const rect = canvas.getBoundingClientRect();
        m.x = clamp((event.clientX - rect.left) / 500,0,1);
        m.y = clamp((event.clientY - rect.top) / 500,0,1);
    }
    
    function clamp(num,min,max){return Math.min(Math.max(num,min),max);}
    
    function createTex(values){
        var cv = document.createElement("canvas");
        var cxt = cv.getContext("2d");
        cv.width = values.length;
        cv.height = 1;
        var img = cxt.createImageData(cv.width,cv.height);
        var imgd = img.data;
    
        /* Store values in canvas */
        for (var i = 0; i < values.length; i++){
            imgd[i * 4] = values[i][0]
            imgd[i * 4 + 1] = values[i][1];
            imgd[i * 4 + 2] = values[i][2];
            imgd[i * 4 + 3] = 0;
        }
    
        tex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,img);
    
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAX_FILTER, gl.NEAREST);
    
        gl.bindTexture(gl.TEXTURE_2D, null);
    }
    
    function toggleRender(){
        renderMode = !renderMode;
    }
    
    
    function resolutionChange() {
        resolution = document.getElementById("resolution-slider").value * 10;
        canvas.width = resolution;
        canvas.height = resolution;
        document.getElementById("resolution-display").innerHTML = resolution;
    }