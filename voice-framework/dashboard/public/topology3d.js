/**
 * 3D Topology Visualization
 * Displays principles on a 3D plane using Three.js
 */

class Topology3D {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.error(`Container ${containerId} not found`);
            return;
        }

        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.principles = [];
        this.connections = [];
        this.currentView = 'all'; // 'all', 'profile', or profileId
        this.selectedProfile = null;

        this.init();
    }

    init() {
        // Create scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x0a0a0a);

        // Create camera
        this.camera = new THREE.PerspectiveCamera(
            75,
            this.container.clientWidth / this.container.clientHeight,
            0.1,
            1000
        );
        this.camera.position.set(0, 10, 20);
        this.camera.lookAt(0, 0, 0);

        // Create renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.renderer.shadowMap.enabled = true;
        this.container.appendChild(this.renderer.domElement);

        // Add orbit controls (if available)
        try {
            if (typeof THREE.OrbitControls !== 'undefined') {
                this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
                this.controls.enableDamping = true;
                this.controls.dampingFactor = 0.05;
                this.controls.minDistance = 5;
                this.controls.maxDistance = 50;
            }
        } catch (error) {
            console.warn('OrbitControls not available, using basic camera controls');
        }

        // Add lights
        const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(10, 10, 5);
        directionalLight.castShadow = true;
        this.scene.add(directionalLight);

        const pointLight = new THREE.PointLight(0xffffff, 0.5);
        pointLight.position.set(-10, 10, -5);
        this.scene.add(pointLight);

        // Add grid helper
        const gridHelper = new THREE.GridHelper(30, 30, 0x333333, 0x222222);
        this.scene.add(gridHelper);

        // Add axes helper
        const axesHelper = new THREE.AxesHelper(5);
        this.scene.add(axesHelper);

        // Handle window resize
        window.addEventListener('resize', () => this.onWindowResize());

        // Start animation loop
        this.animate();
    }

    async loadData(view = 'all', profileId = null) {
        try {
            let url = '/api/topology/principles';
            if (view === 'profile' && profileId) {
                url += `?profileId=${profileId}`;
            }

            const response = await fetch(url);
            const data = await response.json();

            if (data.success) {
                this.principles = data.principles || [];
                this.connections = data.connections || [];
                this.currentView = view;
                this.selectedProfile = profileId;
                this.updateVisualization();
            }
        } catch (error) {
            console.error('Failed to load topology data:', error);
        }
    }

    async loadProfilesView() {
        try {
            const response = await fetch('/api/topology/profiles');
            const data = await response.json();

            if (data.success) {
                this.profilesData = data.profiles || [];
                this.allPrinciples = data.allPrinciples || [];
                this.currentView = 'profiles';
                this.updateProfilesVisualization();
            }
        } catch (error) {
            console.error('Failed to load profiles view:', error);
        }
    }

    updateVisualization() {
        // Clear existing objects
        const objectsToRemove = [];
        this.scene.children.forEach(child => {
            if (child.userData.isPrinciple || child.userData.isConnection) {
                objectsToRemove.push(child);
            }
        });
        objectsToRemove.forEach(obj => this.scene.remove(obj));

        // Create principle spheres
        this.principles.forEach(principle => {
            const geometry = new THREE.SphereGeometry(0.3, 16, 16);
            const material = new THREE.MeshPhongMaterial({
                color: this.getColorForCategory(principle.category),
                emissive: this.getColorForCategory(principle.category),
                emissiveIntensity: 0.2
            });

            const sphere = new THREE.Mesh(geometry, material);
            sphere.position.set(principle.x, principle.y, principle.z);
            sphere.userData = {
                isPrinciple: true,
                principle: principle
            };

            // Add label
            const label = this.createLabel(principle.principle.substring(0, 30));
            label.position.set(principle.x, principle.y + 0.5, principle.z);
            label.userData.isPrinciple = true;
            this.scene.add(label);

            // Add click handler
            sphere.onClick = () => this.showPrincipleDetails(principle);
            this.scene.add(sphere);
        });

        // Create connections
        this.connections.forEach(connection => {
            const geometry = new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(connection.source.x, connection.source.y, connection.source.z),
                new THREE.Vector3(connection.target.x, connection.target.y, connection.target.z)
            ]);

            const material = new THREE.LineBasicMaterial({
                color: 0x666666,
                opacity: connection.strength,
                transparent: true
            });

            const line = new THREE.Line(geometry, material);
            line.userData = {
                isConnection: true,
                connection: connection
            };
            this.scene.add(line);
        });
    }

    updateProfilesVisualization() {
        // Clear existing objects
        const objectsToRemove = [];
        this.scene.children.forEach(child => {
            if (child.userData.isPrinciple || child.userData.isConnection || child.userData.isProfile) {
                objectsToRemove.push(child);
            }
        });
        objectsToRemove.forEach(obj => this.scene.remove(obj));

        // Display each profile's principles in separate clusters
        this.profilesData.forEach((profileData, profileIndex) => {
            const offsetX = (profileIndex % 3 - 1) * 10;
            const offsetZ = Math.floor(profileIndex / 3) * 10;

            // Add profile label
            const profileLabel = this.createLabel(profileData.profileName, 0x00ff00);
            profileLabel.position.set(offsetX, 5, offsetZ);
            profileLabel.userData.isProfile = true;
            this.scene.add(profileLabel);

            // Add principles for this profile
            profileData.principles.forEach(principle => {
                const geometry = new THREE.SphereGeometry(0.25, 16, 16);
                const material = new THREE.MeshPhongMaterial({
                    color: this.getColorForCategory(principle.category),
                    emissive: this.getColorForCategory(principle.category),
                    emissiveIntensity: 0.3
                });

                const sphere = new THREE.Mesh(geometry, material);
                sphere.position.set(
                    principle.x + offsetX,
                    principle.y,
                    principle.z + offsetZ
                );
                sphere.userData = {
                    isPrinciple: true,
                    principle: principle,
                    profileId: profileData.profileId
                };
                this.scene.add(sphere);
            });
        });

        // Add all principles in center
        this.allPrinciples.forEach(principle => {
            const geometry = new THREE.SphereGeometry(0.2, 16, 16);
            const material = new THREE.MeshPhongMaterial({
                color: 0x888888,
                emissive: 0x888888,
                emissiveIntensity: 0.1
            });

            const sphere = new THREE.Mesh(geometry, material);
            sphere.position.set(principle.x, principle.y, principle.z);
            sphere.userData = {
                isPrinciple: true,
                principle: principle,
                isAllPrinciple: true
            };
            this.scene.add(sphere);
        });
    }

    createLabel(text, color = 0xffffff) {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 256;
        canvas.height = 64;

        context.fillStyle = `#${color.toString(16).padStart(6, '0')}`;
        context.font = '24px Arial';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(text, 128, 32);

        const texture = new THREE.CanvasTexture(canvas);
        const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
        const sprite = new THREE.Sprite(spriteMaterial);
        sprite.scale.set(2, 0.5, 1);

        return sprite;
    }

    getColorForCategory(category) {
        const colors = {
            'fact': 0x00ff00,
            'value': 0x0088ff,
            'definition': 0xff8800,
            'relationship': 0xff00ff,
            'process': 0x00ffff,
            'property': 0xffff00,
            'assertion': 0xff0000,
            'document': 0x888888
        };
        return colors[category] || 0xffffff;
    }

    showPrincipleDetails(principle) {
        // Show principle details in a modal or side panel
        console.log('Principle details:', principle);
        // You can implement a modal or update a details panel here
    }

    onWindowResize() {
        this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        if (this.controls) {
            this.controls.update();
        }

        // Rotate principle spheres slightly
        this.scene.children.forEach(child => {
            if (child.userData.isPrinciple && child.rotation) {
                child.rotation.y += 0.01;
            }
        });

        this.renderer.render(this.scene, this.camera);
    }

    dispose() {
        if (this.renderer) {
            this.renderer.dispose();
        }
        window.removeEventListener('resize', this.onWindowResize);
    }
}

