precision highp float;
precision highp int;

uniform float u_Time; // Framecount / 60 (assumes 60 FPS)
uniform vec2 u_Mouse; // Mouse coords (0-1), m.xy
uniform float resolution; // Resolution (always square (500-2000))

uniform bool renderMode; // Switches between fractals

uniform sampler2D colors; // 2D texture used to pass a color array (16 long)

struct surface{
    float sd;
    vec3 col;
};

mat3 identity(){
    return mat3(
        vec3(1,0,0),
        vec3(0,1,0),
        vec3(0,0,1)
        );
}

mat3 rotateY(float theta){
    float c = cos(theta);
    float s = sin(theta);
    return mat3(
        vec3(c,0,s),
        vec3(0,1,0),
        vec3(-s,0,c)
    );
}

// Map function from 0-inputEnd to 0-outputEnd
float map(in float num, in float inputEnd, in float outputEnd, in float n){
    return (outputEnd * pow(num,n))/pow(inputEnd,n); // Parabolic
}

surface mandelbulbGen(in vec3 pos, in mat3 transformation){
    
    vec3 z = pos;
    z *= transformation;
    float delta_r = 1.; // Gradient of the distance from the origin
    float r = 0.;  // Distance from origin of point
    float n = 8.;  // Power
    float dist = 9999.;
    
    for (int i = 0; i < 200; i++){
        r = length(z); // Distance from origin to z
        dist = min(dist, r);
        if (r > 2.){break;} // Escape iteration if r > escape radius
        
        // Obatain polar angles
        float phi = atan(z.y,z.x);
        float theta = acos(z.z/r);
        // Calculate gradient of r
        delta_r = (pow(r,n-1.)*n*delta_r) + 1.;
        
        // Scale and rotate z
        float rn = pow(r,n);
        phi *= n;
        theta *= n;
        
        // Convert back to cartesian
        z = rn * vec3(sin(theta)*cos(phi), sin(phi)*sin(theta), cos(theta));
        // Make relative to pos
        z += pos;
    }
    // Scaling and returning log(r) * r/delta_r as estimated distance
    //Sample Tex
    // 0.8808024927008636 obtained from calculating maximum distance within mandelbulb
    vec3 col = texture2D(colors, vec2(map(sqrt(dist),0.8808024927008636,1.,8.), 0)).xyz;
    return surface(0.5 * log(r) * r/delta_r,col);
}

surface scene(in vec3 pos){
    //surface mandelbulb = surface(length(pos) - 1.,0.5 + 0.5*cos(u_Time+pos.xyx+vec3(0,2,4)));
    surface mandelbulb = mandelbulbGen(pos, rotateY(u_Time * 3.14159 / 25.));

    return mandelbulb;
}

vec3 calcNormals(in vec3 p){
    const vec3 nudge = vec3(0.01, 0.0, 0.0);
    
    float gradX = scene(p + nudge.xyy).sd - scene(p - nudge.xyy).sd;
    float gradY = scene(p + nudge.yxy).sd - scene(p - nudge.yxy).sd;
    float gradZ = scene(p + nudge.yyx).sd - scene(p - nudge.yyx).sd;
    
    vec3 normal = vec3(gradX, gradY, gradZ);
    
    return normalize(normal);
}

vec3 raymarch(in vec3 ro, in vec3 rd, in vec3 lp){
    // VAR_SETUP
    float totalDis = 0.0;
    
    const int MAX_STEPS = 100;
    const float MIN_DIS = 0.001;
    const float MAX_DIS = 10.0;
    
    // Raymarching loop
    for (int i = 0; i <= MAX_STEPS; ++i){
        vec3 pos = ro + totalDis * rd;
        surface sc = scene(pos);
        
        // CASE: HIT DETECTED
        if (sc.sd < MIN_DIS){
            vec3 normal = calcNormals(pos);
            
            vec3 ld = normalize(pos - lp);
            float diffuseIntensity = max(0.0, dot(normal, ld));
            
            return(sc.col * diffuseIntensity);
        }
        // CASE: MAX_DIST EXCEEDED
        if (totalDis > MAX_DIS){
            break;
        }
        totalDis += sc.sd;
    }
    return vec3(1.0,1.0,1.0);
}

vec2 zSquared(in vec2 z){
    return vec2(z.x * z.x - z.y * z.y, z.x * z.y * 2.);
}

vec3 mandelbrot(in vec2 c){
    vec2 z = c;// Initial value of z
    float dist = 9999.;

    for (int i = 0; i < 50; i++){
        if (z.x * z.x + z.y * z.y > 16.){break;}
        z = zSquared(z) + c;
        dist = min(dist,length(z));
    }
    vec3 col = texture2D(colors,vec2(1.-map(sqrt(dist),0.8808024927008636,1.,1.),0)).xyz;
    return col;
}

void main() {
    vec2 uv = vec2(gl_FragCoord.x / resolution, gl_FragCoord.y / resolution);

    vec3 col;

    if (!renderMode){
        uv.x -= 0.5;
        uv.y -= 0.5;

        vec3 virtualCamera = vec3(0,0,-3.);
        vec3 rayDirection = vec3(uv, 1.0);
        vec3 lightPos = vec3(2, -10, 2);
        col = raymarch(virtualCamera, rayDirection, lightPos);
    }
    else {

        uv.x = uv.x * 2.5 - 2.;
        uv.y = uv.y * 2.5 - 1.25;

        col = mandelbrot(uv);
    }
    
    gl_FragColor = vec4(col, 1);
}