const canvas = document.getElementById("renderCanvas");
const engine = new BABYLON.Engine(canvas, true);


let score = 0;
let speed = 0.1;
let maxX = Math.PI/4;
let minX = -Math.PI/3;
let mouseX = 0;
let mouseY = 0;
let mouseSensitivity = 0.001;
let time = 0;
let bulletCount = 5;
let bulletSpeed = 0.1;
let bulletTimeout = 0.16;
let bulletCD = 0;
let bulletDistance = 10;
let enemySpeed = 0.02;
let enemyRate = 0.005;
let enemyMinDistance = 80;
let enemyMaxDistance = 115;
let enemySize = 0.4;

const bullets = [];
const bulletGoneArray = [];
const enemies = [];
const enemyGoneArray = [];



const createScene = ()=>{
	const scene = new BABYLON.Scene(engine);
	scene.collisionsEnabled = true;
	scene.gravity = new BABYLON.Vector3(0, -9.8, 0);

	const camera = new BABYLON.UniversalCamera("camera", new BABYLON.Vector3(0, 0, 0), scene);
	camera.position.y = 1.2;
	camera.position.z = -3;
	camera.rotation.x = 0.2;
	camera.inputs.clear();

	const shaderMaterial = createShaders(scene);
	const enemyMat = new BABYLON.StandardMaterial("enemyMat");
	enemyMat.diffuseColor = new BABYLON.Color3(0.1, 3, 0.1);

	//Light
	const light = new BABYLON.HemisphericLight("light1", new BABYLON.Vector3(0, 5, 5), scene);
	light.intensity = 0.6;
	light.specular = BABYLON.Color3.Black();

	const light2 = new BABYLON.DirectionalLight("light2", new BABYLON.Vector3(0, -0.5, -1.0), scene);
	light2.position = new BABYLON.Vector3(0, 5, 5);


	//Shadow
	const shadowGenerator = new BABYLON.ShadowGenerator(1024, light2);
	shadowGenerator.useBlurExponentialShadowMap = true;
	shadowGenerator.blurKernel = 32;


	//World
	const env = scene.createDefaultEnvironment({
		enableGroundShadow : true,
		groundSize : 75,
		skyboxSize : 75,
		groundTexture : "./assets/groundTex.jpg" 
	});
	env.setMainColor(BABYLON.Color3.Gray());
	


	const player = BABYLON.MeshBuilder.CreateBox("player", {}, scene);
	player.scaling.y = 1;
	player.position.y = 1;
	player.material = shaderMaterial;
	player.checkCollisions = true;
	//const target = new BABYLON.TransformNode();
	//target.parent = player;
	camera.parent = player;


	scene.actionManager = new BABYLON.ActionManager(scene);
	const inputMap = {};
	scene.actionManager.registerAction(new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnKeyDownTrigger, (event) => {
		inputMap[event.sourceEvent.key] = event.sourceEvent.type == "keydown";
	}));
	scene.actionManager.registerAction(new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnKeyUpTrigger, (event) => {
		inputMap[event.sourceEvent.key] = event.sourceEvent.type == "keydown";
	}));


	/*Screen Pointer Lock */
	const mouseMove = (e) => {
		let deltaX = e.movementX || e.mozMovementX || e.webkitMovementX || 0;
		let deltaY = e.movementY || e.mozMovementY || e.webkitMovementY || 0;

		mouseX += deltaX * mouseSensitivity;
		mouseY += deltaY * mouseSensitivity;
		mouseY = clamp(mouseY, minX, maxX);
	}
	const toggleLock = ()=>{
		if(document.pointerLockElement === canvas || document.mozPointerLockElement === canvas || document.webkitPointerLockElement ===canvas){
			document.addEventListener("mousemove", mouseMove, false);
		}else{
			document.removeEventListener("mousemove", mouseMove, false);
		}
	}

	document.addEventListener("pointerlockchange", toggleLock, false);
	document.addEventListener("mozpointerlockchange", toggleLock, false);
	document.addEventListener("webkitpointerlockchange", toggleLock, false);

	canvas.onclick = ()=>{
		canvas.requestPointerLock = canvas.requestPointerLock || canvas.mozRequestPointerLock || canvas.webkitRequestPointerLock;
		canvas.requestPointerLock();
	};








/*BeforeRenderObservable*/
	scene.onBeforeRenderObservable.add(()=> {

		//MouseControls
		player.rotation.y = mouseX;
		player.rotation.x = mouseY;



		//KeyboardControls
		if(inputMap["w"] || inputMap["ArrowUp"]){
			//move forward
			player.position.z += (Math.cos(player.rotation.y) * speed);
			player.position.x += (Math.sin(player.rotation.y) * speed);
		}if(inputMap["s"] || inputMap["ArrowDown"]){
			//move backwards
			player.position.z -= (Math.cos(player.rotation.y) * speed);
			player.position.x -= (Math.sin(player.rotation.y) * speed);
		}if(inputMap["a"] || inputMap["ArrowLeft"]){
			//move to the left
			player.position.z += (Math.sin(player.rotation.y) * speed);
			player.position.x -= (Math.cos(player.rotation.y) * speed);
		}if(inputMap["d"] || inputMap["ArrowRight"]){
			//move to the right
			player.position.z -= (Math.sin(player.rotation.y) * speed);
			player.position.x += (Math.cos(player.rotation.y) * speed);
		}


/*bullets*/
		if(inputMap[" "] && bulletCD<=0 && bullets.length < bulletCount){
			bullets.push(createBullet(player.position, player.rotation));
			bulletCD = bulletTimeout;
		}
		if(bulletCD > 0){
			bulletCD -= 0.01;
		}
		bullets.forEach((bullet, index) =>{
			bullet.position.x += bulletSpeed * Math.sin(bullet.rotation.y);
			bullet.position.y -= bulletSpeed * Math.sin(bullet.rotation.x);
			bullet.position.z += bulletSpeed * Math.cos(bullet.rotation.y);
			bullet.goneDistance -= bulletSpeed;
			if(bullet.goneDistance < 0){
				bulletGoneArray.push(index);
			}
		})
		while(bulletGoneArray.length > 0){
			bullets[bulletGoneArray[bulletGoneArray.length-1]].dispose();
			bullets.splice(bulletGoneArray[bulletGoneArray.length-1], 1);
			bulletGoneArray.pop();
		}
		console.log(bullets.length);


/*enemies*/
		let randomValue = Math.random();
		if(randomValue <= enemyRate){
			enemies.push(createEnemy(player.position, enemyMat));
		}
		enemies.forEach((enemy, index) => {
			enemy.position.x += enemySpeed * (player.position.x - enemy.position.x);
			enemy.position.y += enemySpeed * (player.position.y - enemy.position.y);
			enemy.position.z += enemySpeed * (player.position.z - enemy.position.z);
		});
		while(enemyGoneArray.length > 0){
			enemyGoneArray[enemyGoneArray.length - 1].dispose()
			enemyGoneArray.pop();
		}


		shaderMaterial.setFloat("time", time);
		time += 0.01;
	});

	return scene;
}

/*--------------------------------------------*/
/*Functions Start*/

const clamp = (target, min, max)=>{
	if(target <= min){
		return min;
	}if(target >= max){
		return max;
	}return target;
}

const createEnemy= (position, enemyMat) => {
	const enemy = new BABYLON.MeshBuilder.CreateSphere("enemy", {}, scene);
	enemy.position.x = position.x + Math.ceil((0.5 - Math.random())*(enemyMinDistance + (enemyMaxDistance-enemyMinDistance) * Math.random()));
	enemy.position.y = 1 + Math.floor(Math.random() * 3);
	enemy.position.z = position.z + Math.ceil((0.5 - Math.random())*(enemyMinDistance + (enemyMaxDistance-enemyMinDistance) * Math.random()));
	enemy.diameter = enemySize;
	enemy.material = enemyMat;

/*	
	bullets.forEach((bullet, index) => {
		bullet.actionManager.registerAction(
			new BABYLON.ExecuteCodeAction(
				{
					trigger : BABYLON.ActionManager.OnIntersectionEnterTrigger,
					parameter : {
						mesh : enemy,
					}
				},
				() => {
					bullet.dispose();
					enemyGoneArray.push(enemy);
				}
			)
		)
	});
*/
	return enemy;
}


const createBullet = (position, rotation)=>{
	const bullet = BABYLON.MeshBuilder.CreateBox("bullet", {}, scene);
	bullet.scaling = new BABYLON.Vector3(0.1, 0.1, 0.1);
	bullet.position.x = position.x;
	bullet.position.y = position.y;
	bullet.position.z = position.z;
	bullet.rotation.x = rotation.x;
	bullet.rotation.y = rotation.y;
	bullet.rotation.z = rotation.z;
	bullet.goneDistance = bulletDistance;

	bullet.actionManager = new BABYLON.ActionManager(scene);
	enemies.forEach((enemy, index) => {
		bullet.actionManager.registerAction(
			new BABYLON.ExecuteCodeAction(
				{
					trigger : BABYLON.ActionManager.OnIntersectionEnterTrigger,
					parameter : {
						mesh : enemy,
					}
				},
				() => {
					bullet.dispose();
					enemyGoneArray.push(enemy);
				}
			)
		);
	})
	return bullet;
}

//shader
const createShaders = (scene)=>{
	BABYLON.Effect.ShadersStore["customVertexShader"]=`
		precision highp float;

		//Attributes
		attribute vec3 position;
		attribute vec3 normal;
		attribute vec2 uv;

		//Uniforms
		uniform mat4 worldViewProjection;

		//Varying
		varying vec2 vUV;

		void main(void){
			gl_Position = worldViewProjection * vec4(position, 1.0);

			vUV = uv;
		}`;

	BABYLON.Effect.ShadersStore["customFragmentShader"]=`
		precision highp float;

		varying vec2 vUV;
		uniform sampler2D textureSampler;
		uniform float time;

		void main(void){
			vec2 vvUV;
			vvUV = vec2(vUV.x * (0.75 + 0.25*sin(time/2.0)), vUV.y * (0.65 + 0.35*cos(time/3.0)));
			gl_FragColor = texture2D(textureSampler, vvUV);
		}`;


	const shaderMaterial = new BABYLON.ShaderMaterial("shader", scene, 
		{
			vertex : "custom",
			fragment : "custom",
		},
		{
			attributes : ["position", "normal", "uv"],
			uniforms : ["world", "worldView", "worldViewProjection", "view", "projection"]
		});
	const pewdsTexture = new BABYLON.Texture("./assets/pewds.jpg");
	shaderMaterial.setTexture("textureSampler", pewdsTexture);
	shaderMaterial.backFaceCulling = false;

	return shaderMaterial;
}


/*Functions End*/
/*--------------------------------------------*/


const scene = createScene();
engine.runRenderLoop(()=>{
	scene.render();
});
window.addEventListener("resize", ()=>{
	engine.resize();
});

