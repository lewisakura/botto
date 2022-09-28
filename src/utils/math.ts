import * as math from 'mathjs';

type Leaf = TreeNode | number;

class TreeNode {
    private left?: Leaf;
    private right?: Leaf;
    private operator: string;

    constructor(left: Leaf, right: Leaf, operator: string) {
        this.left = left;
        this.right = right;
        this.operator = operator;
    }

    toString() {
        return `(${this.left} ${this.operator} ${this.right})`;
    }
}

const ops = ['/', '*', '-', '+', '%', '^'];

function random(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function tree(numNodes: number): Leaf {
    if (numNodes === 1) return random(1, 30);

    const left = tree(Math.floor(numNodes / 2));
    const right = tree(Math.ceil(numNodes / 2));

    const op = ops[Math.floor(Math.random() * ops.length)];
    return new TreeNode(left, right, op);
}

export function generateMathEquation(complexity: number, min: number = 1, max: number = 100): [equation: string, result: number] {
    while (true) {
        try {
            const unparsedEquation = tree(complexity).toString();
            const equation = math.parse(unparsedEquation.substring(1, unparsedEquation.length - 1));
            const result = equation.evaluate();
            if (result % 1 === 0 && result >= min && result <= max) return [equation.toString(), result];
        } catch {
            // invalid math expression, continue
            continue;
        }
    }
}
