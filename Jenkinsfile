pipeline {
    agent any

    options {
        timestamps()
        disableConcurrentBuilds()
    }

    parameters {
        string(name: 'AWS_REGION', defaultValue: 'ap-south-1', description: 'AWS region')
        string(name: 'AWS_ACCOUNT_ID', defaultValue: '', description: '12-digit AWS account ID')
        string(name: 'EKS_CLUSTER_NAME', defaultValue: 'blogging-eks', description: 'EKS cluster')
        string(name: 'ECR_REPOSITORY', defaultValue: 'blogging-api', description: 'ECR repository')
        string(name: 'K8S_NAMESPACE', defaultValue: 'blogging', description: 'Kubernetes namespace')
    }

    environment {
        IMAGE_TAG = "${BUILD_NUMBER}"
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Backend Tests') {
            steps {
                dir('backend') {
                    sh 'npm install'
                    sh 'npm test'
                }
            }
        }

        stage('Frontend Build') {
            steps {
                dir('frontend') {
                    sh 'npm install'
                    sh 'npm run build'
                }
            }
        }

        stage('SonarQube') {
            steps {
                withSonarQubeEnv('sonarqube') {
                    sh 'sonar-scanner -Dsonar.projectKey=blogging-platform -Dsonar.sources=backend/src,frontend/src'
                }
            }
        }

        stage('Trivy Filesystem Scan') {
            steps {
                sh 'trivy fs --exit-code 1 --severity CRITICAL . --ignore-unfixed'
            }
        }

        stage('Build and Scan Images') {
            steps {
                sh 'docker build -t blogging-api:${IMAGE_TAG} ./backend'
                sh 'docker build -t blogging-frontend:${IMAGE_TAG} ./frontend'
                sh 'trivy image --exit-code 1 --severity CRITICAL blogging-api:${IMAGE_TAG} --ignore-unfixed'
                sh 'trivy image --exit-code 1 --severity CRITICAL blogging-frontend:${IMAGE_TAG} --ignore-unfixed'
            }
        }

        stage('Push to ECR') {
            when {
                expression {
                    return params.AWS_ACCOUNT_ID?.trim()
                }
            }
            steps {
                withCredentials([[$class: 'AmazonWebServicesCredentialsBinding', credentialsId: 'aws-credentials']]) {
                    sh '''
                        aws ecr get-login-password --region "$AWS_REGION" | docker login --username AWS --password-stdin "$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com"
                        docker tag blogging-api:$IMAGE_TAG "$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPOSITORY:$IMAGE_TAG"
                        docker push "$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPOSITORY:$IMAGE_TAG"
                    '''
                }
            }
        }

        stage('Deploy to EKS') {
            when {
                expression {
                    return params.AWS_ACCOUNT_ID?.trim()
                }
            }
            steps {
                withCredentials([[$class: 'AmazonWebServicesCredentialsBinding', credentialsId: 'aws-credentials']]) {
                    sh '''
                        aws eks update-kubeconfig --region "$AWS_REGION" --name "$EKS_CLUSTER_NAME"
                        helm upgrade --install blogging-app ./helm/blogging-app --namespace "$K8S_NAMESPACE" --create-namespace
                    '''
                }
            }
        }
    }

    post {
        always {
            echo 'DevSecOps pipeline execution finished.'
        }
    }
}